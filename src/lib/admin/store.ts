import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { normalizeProject, type Project, type Shot } from "@/data/site";

const DATA_FILE = path.join(process.cwd(), "src", "data", "projects.json");
const UPLOAD_URL = "/images/work/uploads/";
const UPLOAD_DIR = path.join(process.cwd(), "public", "images", "work", "uploads");
const VIDEO_URL = "/videos/";
const VIDEO_DIR = path.join(process.cwd(), "public", "videos");
// Files the admin uploads get a random suffix; reels made by scripts/reel don't,
// and are never deleted from here.
const UPLOADED_VIDEO = /^[a-z0-9-]+-[0-9a-f]{8}(-poster)?\.(mp4|webm|webp)$/;

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

// Saves an uploaded MP4 or WebM as it is, under public/videos.
export async function saveVideo(file: File, slug: string, ext: "mp4" | "webm"): Promise<string> {
  await mkdir(VIDEO_DIR, { recursive: true });
  const name = `${slug}-${randomBytes(4).toString("hex")}.${ext}`;
  await writeFile(path.join(VIDEO_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `${VIDEO_URL}${name}`;
}

// Saves a video's poster (its first frame) as WebP, at most 1280px wide.
export async function savePoster(file: File, slug: string): Promise<string> {
  await mkdir(VIDEO_DIR, { recursive: true });
  const name = `${slug}-${randomBytes(4).toString("hex")}-poster.webp`;
  await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(VIDEO_DIR, name));
  return `${VIDEO_URL}${name}`;
}

// Deletes uploaded video files that no project uses any more.
export async function removeUnusedVideos(candidates: string[], projects: Project[]) {
  const inUse = new Set(projects.flatMap((p) => (p.video ? [p.video.mp4, p.video.webm, p.video.poster] : [])));
  for (const src of candidates) {
    const name = src.slice(VIDEO_URL.length);
    if (!src.startsWith(VIDEO_URL) || inUse.has(src) || !UPLOADED_VIDEO.test(name)) continue;
    await unlink(path.join(VIDEO_DIR, name)).catch(() => {});
  }
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

// Records an admin change in Git (see scripts/auto-commit.mjs). Only the
// project list and uploaded images and videos are committed, never other work in
// progress. A failure here never stops the save itself.
export async function commitAdminChange(message: string) {
  const { execFile } = await import("node:child_process");
  const script = path.join(process.cwd(), "scripts", "auto-commit.mjs");
  await new Promise<void>((done) =>
    execFile(process.execPath, [script, "--message", message, "--only", "src/data/projects.json", "public/images/work/uploads", "public/videos"], { cwd: process.cwd() }, (error, _out, err) => {
      if (error) console.warn("Admin: couldn't record the change in Git.", err || error.message);
      done();
    }),
  );
}
