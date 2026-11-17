// Tests for how project screenshots are framed (browser window or phone).
// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { deviceOf, normalizeProject, platformName, platforms, projects, shotsFor, suggestPlatform, type Shot } from "@/data/site";

const wide: Shot = { src: "/a.webp", width: 1600, height: 900, alt: "" };
const tall: Shot = { src: "/b.webp", width: 1080, height: 2340, alt: "" };

test("one-platform projects frame every shot the same way", () => {
  assert.equal(deviceOf(tall, "web"), "web");
  assert.equal(deviceOf(wide, "mobile"), "mobile");
  assert.equal(deviceOf({ ...wide, device: "mobile" }, "web"), "web", "a stray per-shot frame is ignored");
});

test("website + mobile projects frame each shot on its own, by choice or by shape", () => {
  assert.equal(deviceOf(wide, "both"), "web");
  assert.equal(deviceOf(tall, "both"), "mobile");
  assert.equal(deviceOf({ ...wide, device: "mobile" }, "both"), "mobile", "the chosen frame wins over the shape");
  const p = { platform: "both" as const, shots: [wide, tall, { ...tall, src: "/c.webp", device: "web" as const }] };
  assert.deepEqual(shotsFor(p, "web").map((s) => s.src), ["/a.webp", "/c.webp"]);
  assert.deepEqual(shotsFor(p, "mobile").map((s) => s.src), ["/b.webp"]);
});

test("the admin suggests a frame from the images' shapes", () => {
  assert.equal(suggestPlatform([]), "web");
  assert.equal(suggestPlatform([wide, wide]), "web");
  assert.equal(suggestPlatform([tall, tall]), "mobile");
  assert.equal(suggestPlatform([wide, tall]), "both");
});

test("projects.json loads with valid platforms and frames", () => {
  for (const p of projects) {
    assert.ok(platforms.includes(p.platform), `${p.slug}: ${p.platform}`);
    assert.ok(platformName[p.platform], p.slug);
    for (const s of p.shots) assert.ok(s.device === undefined || s.device === "web" || s.device === "mobile", `${p.slug}: ${s.src}`);
  }
  const loaded = normalizeProject({ slug: "x", title: "x", year: "2026", kind: "x", summary: "x", tech: ["x"], platform: "both", shots: [{ ...wide, device: "tablet" }, { ...tall, device: "mobile" }] });
  assert.deepEqual(loaded.shots.map((s) => s.device), [undefined, "mobile"], "an unknown frame is dropped");
  assert.equal(normalizeProject({ slug: "y", title: "y", year: "2026", kind: "y", summary: "y", tech: ["y"], shots: [tall, tall, wide] }).platform, "mobile", "older entries without a platform");
});
