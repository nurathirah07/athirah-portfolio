"use server";
import { redirect } from "next/navigation";
import { adminEnabled, endSession, isSignedIn, passwordMatches, startSession } from "@/lib/admin/auth";
import { commitAdminChange, readProjects, removeUnusedUploads, saveUpload, writeProjects } from "@/lib/admin/store";
import { deviceOf, platforms, type Device, type Platform, type Project, type Shot } from "@/data/site";

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string>;
  slug?: string;
};

const MAX_FILE = 8 * 1024 * 1024; // 8 MB per image
const MAX_SHOTS = 12;

// Every action re-checks the session itself rather than trusting the page.
async function requireAdmin() {
  if (!adminEnabled || !(await isSignedIn())) throw new Error("Not signed in");
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  if (!adminEnabled) return { error: "The admin only runs locally with npm run dev." };
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 700)); // slows down guessing
    return { error: "That password isn't right." };
  }
  await startSession();
  redirect("/admin");
}

export async function signOut() {
  await endSession();
  redirect("/admin");
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveProject(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const projects = await readProjects();
  const originalSlug = text(form, "originalSlug");
  const existing = projects.find((p) => p.slug === originalSlug);

  const title = text(form, "title");
  const slug = text(form, "slug").toLowerCase();
  const year = text(form, "year");
  const kind = text(form, "kind");
  const summary = text(form, "summary");
  const link = text(form, "link");
  const tech = text(form, "tech").split(",").map((t) => t.trim()).filter(Boolean);
  const platform = text(form, "platform") as Platform;

  const fields: Record<string, string> = {};
  if (!title) fields.title = "Add a title.";
  else if (title.length > 80) fields.title = "Keep the title under 80 characters.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fields.slug = "Use lowercase letters, numbers and dashes, e.g. my-project.";
  else if (projects.some((p) => p.slug === slug && p !== existing)) fields.slug = "Another project already uses this.";
  if (!/^\d{4}$/.test(year)) fields.year = "Use a 4-digit year, e.g. 2026.";
  if (!kind) fields.kind = "Add a type, e.g. Internship.";
  if (!summary) fields.summary = "Add a short description.";
  else if (summary.length > 400) fields.summary = "Keep it under 400 characters.";
  if (tech.length === 0) fields.tech = "List at least one tool.";
  if (!platforms.includes(platform)) fields.platform = "Choose website, mobile app, or both.";
  if (link && !/^https?:\/\/\S+$/.test(link)) fields.link = "Use a full web address starting with https://";

  // Which frame each image goes in. Only "both" projects store it per image;
  // anything else that comes in is ignored.
  const asDevice = (value: unknown): Device | undefined => (value === "web" || value === "mobile" ? value : undefined);

  // Kept screenshots may only be ones this project already had.
  let kept: Shot[] = [];
  let newDevices: (Device | undefined)[] = [];
  try {
    const order = JSON.parse(text(form, "shots") || "[]") as { src: string; alt: string; device?: string }[];
    const known = new Map((existing?.shots ?? []).map((s) => [s.src, s]));
    kept = order.flatMap(({ src, alt, device }) => {
      const shot = known.get(src);
      return shot ? [{ ...shot, alt: String(alt ?? "").trim().slice(0, 160) || shot.alt, device: asDevice(device) }] : [];
    });
    newDevices = (JSON.parse(text(form, "fileDevices") || "[]") as unknown[]).map(asDevice);
  } catch {
    return { error: "The screenshot list couldn't be read. Reload the page and try again." };
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (kept.length + files.length > MAX_SHOTS) fields.files = `A project can have up to ${MAX_SHOTS} images.`;
  for (const f of files) {
    if (!f.type.startsWith("image/")) fields.files = `${f.name} isn't an image.`;
    else if (f.size > MAX_FILE) fields.files = `${f.name} is over 8 MB.`;
  }

  if (Object.keys(fields).length) return { error: "Please fix the highlighted fields.", fields };

  let uploaded: Shot[];
  try {
    uploaded = await Promise.all(files.map(async (f, i) => ({ ...(await saveUpload(f, slug, `${title} screenshot`)), device: newDevices[i] })));
  } catch {
    return { error: "One of the images couldn't be processed. Try a PNG, JPG or WebP file.", fields: { files: "Upload failed." } };
  }

  // For "both", every image keeps a definite frame (its shape decides if none was chosen).
  // For one platform, the per-image frame is dropped: the platform decides.
  const shots: Shot[] = [...kept, ...uploaded].map(({ device, ...shot }) =>
    platform === "both" ? { ...shot, device: deviceOf({ ...shot, device }, "both") } : shot,
  );
  if (platform === "both" && !(shots.some((x) => x.device === "web") && shots.some((x) => x.device === "mobile")) && shots.length > 1) {
    return { error: "Please fix the highlighted fields.", fields: { platform: "For website + mobile, mark at least one image as each. Or pick just one." } };
  }
  const project: Project = { slug, title, year, kind, summary, tech, platform, shots, ...(link ? { link } : {}) };
  const next = existing ? projects.map((p) => (p === existing ? project : p)) : [project, ...projects];
  await writeProjects(next);
  await removeUnusedUploads((existing?.shots ?? []).map((s) => s.src), next);
  await commitAdminChange(existing ? `Admin: updated ${title}` : `Admin: added ${title}`);

  return { ok: true, slug, message: existing ? "Changes saved." : "Project added." };
}

export async function deleteProject(slug: string): Promise<FormState> {
  await requireAdmin();
  const projects = await readProjects();
  const target = projects.find((p) => p.slug === slug);
  if (!target) return { error: "That project no longer exists." };
  const next = projects.filter((p) => p !== target);
  await writeProjects(next);
  await removeUnusedUploads(target.shots.map((s) => s.src), next);
  await commitAdminChange(`Admin: deleted ${target.title}`);
  return { ok: true, message: `Deleted ${target.title}.` };
}

export async function moveProject(slug: string, direction: -1 | 1): Promise<FormState> {
  await requireAdmin();
  const projects = await readProjects();
  const i = projects.findIndex((p) => p.slug === slug);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= projects.length) return { ok: true };
  [projects[i], projects[j]] = [projects[j], projects[i]];
  await writeProjects(projects);
  await commitAdminChange(`Admin: moved ${projects[j].title} ${direction < 0 ? "up" : "down"}`);
  return { ok: true };
}
