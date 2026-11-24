// The visitor log, on the visitor's side (see VisitTracker and /api/visit).
//
// Nothing is sent:
// - on your own computer (localhost) or by test robots (navigator.webdriver);
// - when the browser asks not to be tracked (Global Privacy Control, Do Not Track);
// - from a browser you've marked as yours: open any page with ?me=1 once
//   (?me=0 undoes it), so your own visits don't fill the log.
//
// A visit is one browser tab's time on the site, tied together by a random id
// kept for that tab only (sessionStorage). The only thing remembered between
// visits is a count, so the log can say "2nd visit" without knowing who it is.

const ME = "visit:me";
const ID = "visit:id";
const COUNT = "visit:count";
const PAGE = "visit:page";
const PENDING = "visit:pending";

/** Reads ?me=1 / ?me=0 from the address and remembers it for this browser. */
export function rememberOwner() {
  try {
    const me = new URLSearchParams(location.search).get("me");
    if (me === "1") localStorage.setItem(ME, "1");
    if (me === "0") localStorage.removeItem(ME);
  } catch {
    // storage blocked: nothing to remember
  }
}

export function trackingOff() {
  if (typeof window === "undefined") return true;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.webdriver || nav.globalPrivacyControl || nav.doNotTrack === "1") return true;
  try {
    return localStorage.getItem(ME) === "1";
  } catch {
    return false;
  }
}

/** This tab's visit id, made on first use. Also returns whether it is new. */
export function visitId() {
  try {
    const existing = sessionStorage.getItem(ID);
    if (existing) return { id: existing, fresh: false };
    const id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(ID, id);
    return { id, fresh: true };
  } catch {
    return null; // without storage, pages can't be tied into one visit: send nothing
  }
}

/** Counts this browser's visits: 1 the first time, 2 the next… */
export function nextVisitNumber() {
  try {
    const n = (Number(localStorage.getItem(COUNT)) || 0) + 1;
    localStorage.setItem(COUNT, String(n));
    return n;
  } catch {
    return 1;
  }
}

/** The next page's number within this tab's visit: 1, 2, 3… */
export function nextPageNumber() {
  try {
    const k = (Number(sessionStorage.getItem(PAGE)) || 0) + 1;
    sessionStorage.setItem(PAGE, String(k));
    return k;
  } catch {
    return undefined;
  }
}

// Chrome can cancel a message sent as the page itself closes (a refresh, a
// typed address), so that one is also kept in the tab and sent again from the
// next page. The page's number makes the copy harmless if both arrive.
export function keepForNextPage(event: Record<string, unknown>) {
  try {
    sessionStorage.setItem(PENDING, JSON.stringify(event));
  } catch {
    // storage blocked: the time on that page is lost, nothing else
  }
}
export function sendKept() {
  try {
    const kept = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    if (kept) send(JSON.parse(kept) as Record<string, unknown>);
  } catch {
    // nothing kept
  }
}

/** Sends an event without holding anything up, even while the page closes. */
export function send(event: Record<string, unknown>) {
  const body = JSON.stringify(event);
  try {
    if (navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  void fetch("/api/visit", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

/** Mira received a brief: the log shows this visit under the name they gave. */
export function noteBrief(name: string) {
  if (trackingOff() || !name.trim()) return;
  const visit = visitId();
  if (visit) send({ t: "brief", id: visit.id, name: name.trim() });
}
