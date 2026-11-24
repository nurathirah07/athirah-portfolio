// Receives the visitor log's events from VisitTracker (lib/visits/client.ts):
// a page opened, how long they stayed on it, and a brief sent to Mira.
//
// What is kept: the page, the time, the approximate place (city and country,
// from Vercel's location headers), where they came from (the linking site's
// name only), and the device and browser in words. The IP address is never
// stored: it is only scrambled into a short-lived key that limits how fast
// one connection can write.
import { createHash } from "node:crypto";
import { allowed, recordBrief, recordStay, recordView, visitsConnected } from "@/lib/visits/store";
import { describeAgent, isBot, isTrackedPath, sourceOf } from "@/lib/visits/describe";

const ok = () => new Response(null, { status: 204 });
const ID = /^[A-Za-z0-9-]{8,40}$/;
const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
const header = (request: Request, name: string) => {
  const value = request.headers.get(name);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value).slice(0, 60);
  } catch {
    return value.slice(0, 60);
  }
};

export async function POST(request: Request) {
  // Only the live site counts: not `npm run dev`, not Vercel's preview copies.
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview" || !visitsConnected()) return ok();
  const agent = request.headers.get("user-agent") ?? "";
  if (isBot(agent)) return ok();

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return ok();
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return ok();
  }
  const id = text(body.id, 40);
  const path = text(body.path, 80);
  const n = Math.round(Number(body.k));
  const k = n >= 1 && n <= 10_000 ? n : undefined; // the page's number within the visit
  if (!ID.test(id)) return ok();

  try {
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
    const who = createHash("sha256").update(ip).digest("hex").slice(0, 16);
    if (!(await allowed(who))) return ok();

    if (body.t === "view" && isTrackedPath(path)) {
      const { device, browser } = describeAgent(agent);
      const host = new URL(request.url).hostname;
      await recordView(
        {
          id,
          place: { city: header(request, "x-vercel-ip-city"), region: header(request, "x-vercel-ip-country-region"), country: header(request, "x-vercel-ip-country") },
          source: sourceOf(text(body.ref, 300), text(body.tag, 40), host),
          device,
          browser,
          visitNumber: Math.max(1, Math.min(999, Math.round(Number(body.n) || 1))),
        },
        path,
        k,
      );
    } else if (body.t === "stay" && isTrackedPath(path)) {
      await recordStay(id, path, Number(body.s) || 0, k);
    } else if (body.t === "brief") {
      const name = text(body.name, 80).trim();
      if (name) await recordBrief(id, name);
    }
  } catch {
    // The log is a nice-to-have: a database hiccup never shows up for the visitor.
  }
  return ok();
}
