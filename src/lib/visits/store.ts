// Where the visitor log lives: an Upstash Redis database connected to the
// Vercel project (Vercel → Storage → Upstash for Redis). The live site writes
// to it through /api/visit; the admin, running on your computer, reads it with
// the same two settings copied into .env.local. Without them, nothing is
// recorded and the admin explains how to connect it.
//
// For each visit, kept for 90 days:
// - pf:visit:<id>   its fixed details (place, source, device), saved once;
// - pf:events:<id>  what happened, appended as it happens (see VisitEvent);
// and pf:visits indexes the visits by start time.
import { Redis } from "@upstash/redis";
import { foldVisit, type Visit, type VisitEvent, type VisitMeta } from "./describe";

const KEEP_DAYS = 90;
const KEEP_SECONDS = KEEP_DAYS * 24 * 60 * 60;
const MAX_EVENTS = 200;
const INDEX = "pf:visits";
const metaKey = (id: string) => `pf:visit:${id}`;
const eventsKey = (id: string) => `pf:events:${id}`;

// The database's address and key. Vercel names them KV_REST_API_URL and
// KV_REST_API_TOKEN, with the prefix chosen when the database was connected in
// front (e.g. STORAGE_KV_REST_API_URL); Upstash's own names work too.
function settings() {
  const env = process.env;
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN };
  for (const name of Object.keys(env).filter((n) => /(^|_)KV_REST_API_URL$/.test(n)).sort((a, b) => a.length - b.length)) {
    const token = env[name.replace(/URL$/, "TOKEN")];
    if (env[name] && token) return { url: env[name]!, token };
  }
  return null;
}

/** Whether the database's two settings are present. */
export const visitsConnected = () => settings() !== null;

// Created on first use, not when the file loads, so building the site never needs the settings.
let redis: Redis | null = null;
function db() {
  redis ??= new Redis(settings()!);
  return redis;
}

/** At most `perMinute` writes a minute from one connection, so nobody can flood the log. */
export async function allowed(who: string, perMinute = 40) {
  const slot = `pf:rate:${who}:${Math.floor(Date.now() / 60_000)}`;
  const count = await db().incr(slot);
  if (count === 1) await db().expire(slot, 120);
  return count <= perMinute;
}

async function append(id: string, event: VisitEvent) {
  const p = db().pipeline();
  p.rpush(eventsKey(id), event);
  p.ltrim(eventsKey(id), 0, MAX_EVENTS - 1);
  p.expire(eventsKey(id), KEEP_SECONDS);
  await p.exec();
}

/** A page was opened. The first page of a visit also saves its fixed details. */
export async function recordView(first: Omit<VisitMeta, "start">, path: string, k?: number, now = Date.now()) {
  const created = await db().set(metaKey(first.id), { ...first, start: now }, { nx: true, ex: KEEP_SECONDS });
  if (created === "OK") {
    await db().zadd(INDEX, { score: now, member: first.id });
    await db().zremrangebyscore(INDEX, 0, now - KEEP_SECONDS * 1000); // forget visits past the keeping period
  }
  await append(first.id, { t: "view", path, at: now, ...(k ? { k } : {}) });
}

/** They left a page after `seconds`. */
export const recordStay = (id: string, path: string, seconds: number, k?: number, now = Date.now()) =>
  append(id, { t: "stay", path, s: seconds, at: now, ...(k ? { k } : {}) });

/** They sent Mira a brief under this name. */
export const recordBrief = (id: string, name: string, now = Date.now()) => append(id, { t: "brief", name, at: now });

async function load(ids: string[]) {
  const visits: Visit[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    if (!chunk.length) continue;
    const metas = await db().mget<(VisitMeta | null)[]>(...chunk.map(metaKey));
    const p = db().pipeline();
    for (const id of chunk) p.lrange(eventsKey(id), 0, -1);
    const events = (await p.exec()) as VisitEvent[][];
    chunk.forEach((_, j) => {
      const meta = metas[j];
      if (meta) visits.push(foldVisit(meta, events[j] ?? []));
    });
  }
  return visits;
}

/** The most recent visits, newest first. */
export async function recentVisits(count: number) {
  return load(await db().zrange<string[]>(INDEX, 0, count - 1, { rev: true }));
}

/** Every visit that started since `since` (ms), newest first, up to `cap`. */
export async function visitsSince(since: number, cap = 3000) {
  return load(await db().zrange<string[]>(INDEX, Number.MAX_SAFE_INTEGER, since, { byScore: true, rev: true, offset: 0, count: cap }));
}

/** What the admin's Visitors page shows: the latest `count` visits, and every visit of the last 30 days for the totals. */
export async function readLog(count: number) {
  const now = Date.now();
  const [recent, month] = await Promise.all([recentVisits(count), visitsSince(now - 30 * 24 * 60 * 60 * 1000)]);
  return { now, recent, month };
}

export { KEEP_DAYS };
