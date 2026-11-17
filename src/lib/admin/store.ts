import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { normalizeProject, type Project, type Shot } from "@/data/site";

const DATA_FILE = path.join(process.cwd(), "src", "data", "projects.json");
const UPLOAD_URL = "/images/work/uploads/";
const UPLOAD_DIR = path.join(process.cwd(), "public", "images", "work", "uploads");

export async function readProjects(): Promise<Project[]> {
  return (JSON.parse(await readFile(DATA_FILE, "utf8")) as Project[]).map(normalizeProject);
}

// Write to a temporary file first, so a crash mid-save never leaves a broken file.
export async function writeProjects(projects: Project[]) {
  const temp = `${DATA_FILE}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(temp, `${JSON.stringify(projects, null, 2)}\n`, "utf8");
  await rename(temp, DATA_FILE);
}

// Resizes an upload to at most 1600px wide and saves it as WebP.
export async function saveUpload(file: File, slug: string, alt: string): Promise<Shot> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${slug}-${randomBytes(4).toString("hex")}.webp`;
  const input = Buffer.from(await file.arrayBuffer());
  const info = await sharp(input)
    .rotate() // respect phone camera orientation
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(path.join(UPLOAD_DIR, name));
  return { src: `${UPLOAD_URL}${name}`, width: info.width, height: info.height, alt };
}

// Deletes uploaded images that no project uses any more. Images added by
// hand outside the uploads folder are never touched.
export async function removeUnusedUploads(candidates: string[], projects: Project[]) {
  const inUse = new Set(projects.flatMap((p) => p.shots.map((s) => s.src)));
  for (const src of candidates) {
    if (!src.startsWith(UPLOAD_URL) || inUse.has(src)) continue;
    const name = path.basename(src);
    if (name !== src.slice(UPLOAD_URL.length)) continue;
    await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
  }
}
