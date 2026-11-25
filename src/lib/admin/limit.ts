import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { visitsConnected, withinLimit } from "@/lib/visits/store";

const TRIES = 10; // sign-in attempts…
const WINDOW = 15 * 60; // …per 15 minutes, from one connection

/** The connection a request came from, scrambled: the IP address itself is never kept. */
export async function connectionKey() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

// Without the database (on your computer before it's connected), a count in memory.
const local = new Map<string, { count: number; until: number }>();

/**
 * Whether one more sign-in attempt is allowed from this connection. The live
 * site's sign-in page can be found by anyone, so guessing is slowed down to
 * 10 tries per 15 minutes.
 */
export async function signInAllowed(who: string) {
  if (visitsConnected()) {
    try {
      return await withinLimit(`pf:signin:${who}`, TRIES, WINDOW);
    } catch {
      // database unreachable: fall back to counting here
    }
  }
  const now = Date.now();
  const slot = local.get(who);
  if (!slot || slot.until < now) {
    local.set(who, { count: 1, until: now + WINDOW * 1000 });
    return true;
  }
  slot.count++;
  return slot.count <= TRIES;
}
