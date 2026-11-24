// Turns what a browser sends (its user-agent string, the page it came from)
// into the plain words the admin's visitor log shows. No imports, so
// `npm test` can check it without a browser (see visits.test.ts).

export type Page = { path: string; at: number; seconds?: number; k?: number }; // k: its number within the tab's visit

/** One visit: a browser tab's time on the site, page by page. */
export type Visit = {
  id: string;
  start: number; // ms since 1970
  last: number;
  place: { city?: string; region?: string; country?: string };
  source: string; // where they came from, in words: "LinkedIn", "Google", "Direct or an app", "cv" (a tagged link)
  device: string; // "Phone", "Tablet", "Computer"
  browser: string; // "Safari on iOS"
  visitNumber: number; // 1 the first time this browser came, 2 the next…
  pages: Page[];
  brief?: { name: string; at: number }; // they sent Mira a brief, under this name
};

export const MAX_PAGES = 60; // per visit; more than this is someone (or something) clicking around

/** What is fixed for a visit, saved when its first page arrives. */
export type VisitMeta = Omit<Visit, "pages" | "last" | "brief">;

/**
 * What happened in a visit, appended one by one as it happens. Appending
 * can't lose anything when two arrive at once (leaving one page and opening
 * the next happen together), which reading, changing and saving a whole
 * visit could.
 */
export type VisitEvent =
  | { t: "view"; path: string; at: number; k?: number }
  | { t: "stay"; path: string; s: number; at: number; k?: number }
  | { t: "brief"; name: string; at: number };

/** A visit as the admin shows it: its fixed details plus its events, in time order. */
export function foldVisit(meta: VisitMeta, events: VisitEvent[]): Visit {
  let visit: Visit = { ...meta, last: meta.start, pages: [] };
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    if (e.t === "view") visit = withPage(visit, e.path, e.at, e.k);
    else if (e.t === "stay") visit = withStay(visit, e.path, e.s, e.at, e.k);
    else visit = { ...visit, last: Math.max(visit.last, e.at), brief: { name: e.name, at: e.at } };
  }
  return visit;
}

/** True for crawlers, link previews and test robots, which aren't people. */
export function isBot(agent: string) {
  // (WhatsApp/ and TelegramBot are their link-preview robots; people opening a
  // link inside those apps send an ordinary browser's description.)
  return !agent || /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|embedly|WhatsApp\/|curl|wget|python|axios|node-fetch|go-http|java\//i.test(agent);
}

/** "Phone", "Tablet" or "Computer", and the browser with its system, e.g. "Safari on iOS". */
export function describeAgent(agent: string) {
  const ua = agent || "";
  const tablet = /iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua);
  const phone = !tablet && /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua);
  const os = /iPhone|iPad|iPod/i.test(ua)
    ? "iOS"
    : /Android/i.test(ua)
      ? "Android"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/i.test(ua)
          ? "macOS"
          : /CrOS/i.test(ua)
            ? "ChromeOS"
            : /Linux/i.test(ua)
              ? "Linux"
              : "";
  const name = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /FBAN|FBAV|Instagram|LinkedInApp/.test(ua)
          ? /LinkedInApp/.test(ua) ? "LinkedIn app" : /Instagram/.test(ua) ? "Instagram app" : "Facebook app"
          : /Firefox|FxiOS/.test(ua)
            ? "Firefox"
            : /Chrome|CriOS/.test(ua)
              ? "Chrome"
              : /Safari/.test(ua)
                ? "Safari"
                : "a browser";
  return { device: tablet ? "Tablet" : phone ? "Phone" : "Computer", browser: os ? `${name} on ${os}` : name };
}

const KNOWN: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)google\.[a-z.]+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/^t\.co$|(^|\.)(x|twitter)\.com$/, "X"],
  [/(^|\.)jobstreet\.[a-z.]+$/, "JobStreet"],
  [/(^|\.)(mail\.google|outlook\.live|outlook\.office)\.com$/, "Email"],
  [/(^|\.)vercel\.app$/, "Another Vercel site"],
];

/**
 * Where a visit came from, in words. A tagged link wins (…/?ref=cv), then the
 * page that linked here (only its site's name is kept), then "Direct or an
 * app": typed addresses, bookmarks, and links opened from WhatsApp, Telegram
 * or email apps, which don't say where they came from.
 */
export function sourceOf(referrer: string, tag: string, siteHost: string) {
  const cleanTag = tag.trim().slice(0, 40).replace(/[^\w .-]/g, "");
  if (cleanTag) return cleanTag;
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "Direct or an app";
  }
  if (!host || host === siteHost.replace(/^www\./, "")) return "Direct or an app";
  return KNOWN.find(([pattern]) => pattern.test(host))?.[1] ?? host;
}

/** Only the site's own pages are logged (not the admin, not made-up addresses). */
export function isTrackedPath(path: string) {
  return /^\/(about|work|contact)?$|^\/work\/[a-z0-9-]{1,60}$/.test(path);
}

/** A page as words for the log: "Home", "About", "Work", "Cozy Crumb" (from a title lookup), "Contact". */
export function pageName(path: string, titles: Record<string, string>) {
  if (path === "/") return "Home";
  if (path.startsWith("/work/")) return titles[path.slice(6)] ?? path.slice(6);
  return path.slice(1, 2).toUpperCase() + path.slice(2);
}

/** Adds a page to a visit (ignoring an immediate repeat of the same page, and anything past MAX_PAGES). */
export function withPage(visit: Visit, path: string, at: number, k?: number): Visit {
  const lastPage = visit.pages.at(-1);
  if (lastPage?.path === path && at - lastPage.at < 3000) return visit;
  if (visit.pages.length >= MAX_PAGES) return { ...visit, last: at };
  return { ...visit, last: at, pages: [...visit.pages, k === undefined ? { path, at } : { path, at, k }] };
}

/**
 * Records how long they stayed on a page: the page with that number (`k`, so a
 * message that arrives twice changes nothing), or else the latest unfinished
 * view of that path.
 */
export function withStay(visit: Visit, path: string, seconds: number, at: number, k?: number): Visit {
  const s = Math.max(0, Math.min(Math.round(seconds), 60 * 60 * 3));
  for (let i = visit.pages.length - 1; i >= 0; i--) {
    const page = visit.pages[i];
    if (k !== undefined ? page.k === k : page.path === path && page.seconds === undefined) {
      const pages = visit.pages.slice();
      pages[i] = { ...pages[i], seconds: s };
      return { ...visit, last: Math.max(visit.last, at), pages };
    }
  }
  return visit;
}

/** "45s", "3 min", "1 h 5 min". */
export function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
