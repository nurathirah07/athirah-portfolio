// The admin's visitor summary: counts and "top" lists from a set of visits.
// No imports beyond describe.ts, so `npm test` can check it.
import { pageName, type Visit } from "./describe";

const DAY = 24 * 60 * 60 * 1000;
const MALAYSIA = 8 * 60 * 60 * 1000; // UTC+8, no daylight saving

/** Midnight today in Malaysia, as ms since 1970. */
export function startOfToday(now: number) {
  return Math.floor((now + MALAYSIA) / DAY) * DAY - MALAYSIA;
}

/** The `limit` most common values, most common first (ties keep first-seen order). */
export function top(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function placeName(place: Visit["place"], countryName: (code: string) => string) {
  const country = place.country ? countryName(place.country) : "";
  if (place.city && country) return `${place.city}, ${country}`;
  return place.city || country || "Somewhere unknown";
}

export function summarize(visits: Visit[], now: number, titles: Record<string, string>, countryName: (code: string) => string) {
  const today = startOfToday(now);
  const within = (ms: number) => visits.filter((v) => v.start >= now - ms);
  const month = within(30 * DAY);
  return {
    today: visits.filter((v) => v.start >= today).length,
    week: within(7 * DAY).length,
    month: month.length,
    briefs: month.filter((v) => v.brief).length,
    returning: month.filter((v) => v.visitNumber > 1).length,
    sources: top(month.map((v) => v.source), 6),
    countries: top(month.map((v) => (v.place.country ? countryName(v.place.country) : "Unknown")), 6),
    pages: top(month.flatMap((v) => v.pages.map((p) => pageName(p.path, titles))), 6),
  };
}
