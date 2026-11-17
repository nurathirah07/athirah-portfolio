import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { photos } from "@/data/photos";
import { site } from "@/data/site";

// The picture shown when the site's link is shared (LinkedIn, WhatsApp, X…).
// Made at build time from the site's own name, role, colours, font and photo,
// so it stays up to date when those change.

export const alt = `${site.name}, ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#000f08";
const CREAM = "#f3efdd";
const GOLD = "#e0ca3c";

export default async function Image() {
  const [font, photo] = await Promise.all([
    // A fixed-weight copy of the site font: the renderer can't read the
    // site's variable Manrope.ttf (made from it with fontTools, weight 700).
    readFile(join(process.cwd(), "src", "app", "_og", "Manrope-Bold.ttf")),
    // The renderer can't read WebP, so the cut-out photo is converted to PNG.
    sharp(join(process.cwd(), "public", photos.me.src)).resize({ height: 600 }).png().toBuffer(),
  ]);
  const portrait = `data:image/png;base64,${photo.toString("base64")}`;
  const photoWidth = Math.round((600 * photos.me.width) / photos.me.height);
  const kinds = site.services.slice(0, 3).map((s) => s.name);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: INK,
          color: CREAM,
          fontFamily: "Manrope",
          overflow: "hidden",
        }}
      >
        {/* Soft lights in the site's colours */}
        <div style={{ position: "absolute", left: -200, top: -260, width: 760, height: 760, borderRadius: 9999, background: "radial-gradient(circle at 50% 50%, rgba(19,111,99,0.55) 0%, rgba(19,111,99,0) 55%)" }} />
        <div style={{ position: "absolute", right: -120, bottom: -320, width: 820, height: 820, borderRadius: 9999, background: "radial-gradient(circle at 50% 50%, rgba(224,202,60,0.28) 0%, rgba(224,202,60,0) 55%)" }} />
        <div style={{ position: "absolute", right: 160, top: -200, width: 520, height: 520, borderRadius: 9999, background: "radial-gradient(circle at 50% 50%, rgba(62,47,91,0.6) 0%, rgba(62,47,91,0) 55%)" }} />

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 80px", width: 760 }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: GOLD, textTransform: "uppercase" }}>({site.role})</div>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1.02, marginTop: 22, letterSpacing: -2, fontWeight: 700 }}>{site.name}</div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.35, marginTop: 28, color: "rgba(243,239,221,0.78)", maxWidth: 620 }}>{site.heroLine}</div>
          <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
            {kinds.map((kind) => (
              <div key={kind} style={{ display: "flex", fontSize: 20, padding: "10px 20px", borderRadius: 9999, border: "1.5px solid rgba(243,239,221,0.25)", color: "rgba(243,239,221,0.85)" }}>
                {kind}
              </div>
            ))}
          </div>
        </div>

        {/* Photo (a plain <img> is what the image renderer supports) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portrait} width={photoWidth} height={600} alt="" style={{ position: "absolute", right: 70, bottom: 0 }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: `linear-gradient(90deg, ${GOLD}, #f34213)` }} />
      </div>
    ),
    { ...size, fonts: [{ name: "Manrope", data: font, weight: 700, style: "normal" }] },
  );
}
