import { readdirSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "public", "images", "gallery");
const PHOTO = /\.(jpe?g|png|webp|avif)$/i;

/**
 * The photos for the home page gallery: every image in public/images/gallery,
 * in filename order (name them 01-…, 02-… to choose the order). An empty or
 * missing folder gives an empty list, and the gallery isn't shown.
 * Read on the server when the page is built.
 */
export function galleryImages(): string[] {
  try {
    return readdirSync(DIR)
      .filter((f) => PHOTO.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => `/images/gallery/${encodeURIComponent(f)}`);
  } catch {
    return [];
  }
}
