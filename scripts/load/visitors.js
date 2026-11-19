// Many visitors at once: each one opens the home page, the work list, a
// project, About and Contact, pausing between pages like a person reading.
// It checks every page loads and how long the slowest ones take.
//
// Run with k6 (https://k6.io), not node:
//   k6 run scripts/load/visitors.js                                  (local: npm run build && npm start)
//   k6 run -e BASE=https://your-site.vercel.app -e VISITORS=30 scripts/load/visitors.js
//
// It never sends Mira's brief (that would use up the Formspree quota and fill
// the inbox), never opens /admin, and doesn't download the videos (they come
// from Vercel's CDN, not the site's own server).
import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE = (__ENV.BASE || "http://localhost:3000").replace(/\/$/, "");
const VISITORS = Number(__ENV.VISITORS || 20); // how many at the same time, at the peak
const HOLD = __ENV.HOLD || "1m"; // how long the peak lasts

const projects = ["cozy-crumb", "rentngo", "biteright", "hq-inventory", "nrts", "weddingsnap"];

export const options = {
  scenarios: {
    visitors: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: VISITORS }, // people arrive
        { duration: HOLD, target: VISITORS }, // everyone browsing at once
        { duration: "15s", target: 0 }, // they leave
      ],
      gracefulRampDown: "10s",
    },
  },
  // The test fails if more than 1% of pages fail, or the slowest 5% take over 1.5s.
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500"],
    checks: ["rate>0.99"],
  },
};

const pause = () => sleep(2 + Math.random() * 4); // 2–6s reading each page

function visit(name, path, mustContain) {
  const res = http.get(`${BASE}${path}`, { tags: { page: name } });
  check(res, {
    [`${name}: loads`]: (r) => r.status === 200,
    [`${name}: has its content`]: (r) => typeof r.body === "string" && r.body.includes(mustContain),
  });
}

export default function visitor() {
  const slug = projects[Math.floor(Math.random() * projects.length)];
  group("home", () => visit("home", "/", "</html>"));
  pause();
  group("work", () => visit("work", "/work", "</html>"));
  pause();
  group("project", () => visit("project", `/work/${slug}`, "</html>"));
  pause();
  group("about", () => visit("about", "/about", "</html>"));
  pause();
  group("contact", () => visit("contact", "/contact", "assistant-title"));
  pause();
}
