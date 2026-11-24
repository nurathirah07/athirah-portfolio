// Tests for the visitor log's wording and sums. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { describeAgent, foldVisit, isBot, isTrackedPath, MAX_PAGES, pageName, sourceOf, withPage, withStay, type Visit, type VisitEvent } from "./describe";
import { placeName, startOfToday, summarize, top } from "./summary";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const WINDOWS_EDGE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const LINKEDIN_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30";

test("devices and browsers read as words", () => {
  assert.deepEqual(describeAgent(IPHONE), { device: "Phone", browser: "Safari on iOS" });
  assert.deepEqual(describeAgent(ANDROID), { device: "Phone", browser: "Chrome on Android" });
  assert.deepEqual(describeAgent(WINDOWS_EDGE), { device: "Computer", browser: "Edge on Windows" });
  assert.deepEqual(describeAgent(IPAD), { device: "Tablet", browser: "Safari on iOS" });
  assert.equal(describeAgent(LINKEDIN_APP).browser, "LinkedIn app on iOS");
});

test("robots are left out, people opening links inside apps are not", () => {
  for (const agent of ["Googlebot/2.1 (+http://www.google.com/bot.html)", "LinkedInBot/1.0", "WhatsApp/2.23.20.0", "facebookexternalhit/1.1", "Mozilla/5.0 HeadlessChrome/131.0", "TelegramBot (like TwitterBot)", ""]) {
    assert.equal(isBot(agent), true, agent);
  }
  for (const agent of [IPHONE, ANDROID, WINDOWS_EDGE, LINKEDIN_APP]) assert.equal(isBot(agent), false, agent);
});

test("where a visit came from", () => {
  const site = "athirah.vercel.app";
  assert.equal(sourceOf("https://www.linkedin.com/in/someone", "", site), "LinkedIn");
  assert.equal(sourceOf("https://lnkd.in/abc", "", site), "LinkedIn");
  assert.equal(sourceOf("https://www.google.com.my/", "", site), "Google");
  assert.equal(sourceOf("", "", site), "Direct or an app");
  assert.equal(sourceOf("https://athirah.vercel.app/work", "", site), "Direct or an app", "its own pages don't count");
  assert.equal(sourceOf("https://blog.example.org/post", "", site), "blog.example.org");
  assert.equal(sourceOf("https://www.linkedin.com/", "cv", site), "cv", "a tagged link wins");
  assert.equal(sourceOf("", "<script>", site), "script", "tags are cleaned");
});

test("only the site's own pages are logged", () => {
  for (const path of ["/", "/about", "/work", "/contact", "/work/cozy-crumb"]) assert.equal(isTrackedPath(path), true, path);
  for (const path of ["/admin", "/admin/visitors", "/api/visit", "/work/../admin", "/anything", "/work/a/b"]) assert.equal(isTrackedPath(path), false, path);
});

const visit = (over: Partial<Visit> = {}): Visit => ({
  id: "test-visit-1",
  start: 0,
  last: 0,
  place: { city: "Kuala Lumpur", country: "MY" },
  source: "LinkedIn",
  device: "Phone",
  browser: "Safari on iOS",
  visitNumber: 1,
  pages: [],
  ...over,
});

test("pages build up in order, with how long each stayed open", () => {
  let v = visit();
  v = withPage(v, "/", 1000);
  v = withPage(v, "/", 1500); // a quick repeat (a refresh) isn't a new page
  v = withPage(v, "/work", 20_000);
  v = withStay(v, "/", 19, 20_000);
  v = withStay(v, "/work", 42.4, 62_000);
  v = withStay(v, "/work", 99, 70_000); // already reported: ignored
  assert.deepEqual(v.pages, [{ path: "/", at: 1000, seconds: 19 }, { path: "/work", at: 20_000, seconds: 42 }]);
  assert.equal(v.last, 62_000);
  let many = visit();
  for (let i = 0; i < MAX_PAGES + 10; i++) many = withPage(many, i % 2 ? "/work" : "/about", i * 10_000);
  assert.equal(many.pages.length, MAX_PAGES);
});

test("a visit is folded from its events, whatever order they were saved in", () => {
  const meta = { id: "test-visit-2", start: 1000, place: {}, source: "LinkedIn", device: "Phone", browser: "Safari on iOS", visitNumber: 1 };
  // Leaving Home and opening Work happen together; here the second was saved first.
  const events: VisitEvent[] = [
    { t: "view", path: "/", at: 1000 },
    { t: "view", path: "/work", at: 20_001 },
    { t: "stay", path: "/", s: 19, at: 20_000 },
    { t: "brief", name: "Jane Tan", at: 50_000 },
    { t: "stay", path: "/work", s: 35, at: 55_000 },
  ];
  const folded = foldVisit(meta, events);
  assert.deepEqual(folded.pages, [{ path: "/", at: 1000, seconds: 19 }, { path: "/work", at: 20_001, seconds: 35 }]);
  assert.deepEqual(folded.brief, { name: "Jane Tan", at: 50_000 });
  assert.equal(folded.last, 55_000);
  assert.deepEqual(foldVisit(meta, [...events].reverse()).pages, folded.pages, "same result in any order");
});

test("a leave message that arrives twice (resent from the next page) changes nothing", () => {
  const meta = { id: "test-visit-3", start: 0, place: {}, source: "Google", device: "Computer", browser: "Edge on Windows", visitNumber: 1 };
  const folded = foldVisit(meta, [
    { t: "view", path: "/about", at: 0, k: 1 },
    { t: "view", path: "/about", at: 30_000, k: 2 }, // a refresh: the same page again
    { t: "stay", path: "/about", s: 30, at: 30_000, k: 1 },
    { t: "stay", path: "/about", s: 30, at: 30_500, k: 1 }, // the copy
    { t: "stay", path: "/about", s: 12, at: 42_000, k: 2 },
  ]);
  assert.deepEqual(folded.pages.map((p) => p.seconds), [30, 12]);
});

test("page names and places", () => {
  assert.equal(pageName("/", {}), "Home");
  assert.equal(pageName("/about", {}), "About");
  assert.equal(pageName("/work/cozy-crumb", { "cozy-crumb": "Cozy Crumb" }), "Cozy Crumb");
  const name = (code: string) => ({ MY: "Malaysia" })[code] ?? code;
  assert.equal(placeName({ city: "Kuala Lumpur", country: "MY" }, name), "Kuala Lumpur, Malaysia");
  assert.equal(placeName({ country: "MY" }, name), "Malaysia");
  assert.equal(placeName({}, name), "Somewhere unknown");
});

test("today starts at midnight in Malaysia", () => {
  // 2026-11-24 00:30 in Malaysia is 2026-11-23 16:30 UTC.
  const now = Date.UTC(2026, 10, 23, 16, 30);
  assert.equal(startOfToday(now), Date.UTC(2026, 10, 23, 16, 0));
});

test("the summary counts visits, briefs and the top lists", () => {
  const now = Date.UTC(2026, 10, 24, 6, 0);
  const day = 24 * 60 * 60 * 1000;
  const visits = [
    visit({ id: "a", start: now - 60_000, pages: [{ path: "/", at: 0 }, { path: "/work/cozy-crumb", at: 1 }] }),
    visit({ id: "b", start: now - 2 * day, source: "Google", visitNumber: 2, pages: [{ path: "/work/cozy-crumb", at: 0 }], brief: { name: "Jane", at: 0 } }),
    visit({ id: "c", start: now - 20 * day, place: { country: "SG" }, pages: [{ path: "/", at: 0 }] }),
  ];
  const s = summarize(visits, now, { "cozy-crumb": "Cozy Crumb" }, (c) => ({ MY: "Malaysia", SG: "Singapore" })[c] ?? c);
  assert.deepEqual([s.today, s.week, s.month, s.briefs, s.returning], [1, 2, 3, 1, 1]);
  assert.deepEqual(s.sources, [["LinkedIn", 2], ["Google", 1]]);
  assert.deepEqual(s.countries, [["Malaysia", 2], ["Singapore", 1]]);
  assert.deepEqual(s.pages, [["Home", 2], ["Cozy Crumb", 2]]);
  assert.deepEqual(top(["x", "y", "y"], 1), [["y", 2]]);
});
