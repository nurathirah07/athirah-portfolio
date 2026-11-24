import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { adminEnabled, hasPassword, isSignedIn } from "@/lib/admin/auth";
import { readProjects } from "@/lib/admin/store";
import { duration, pageName, type Visit } from "@/lib/visits/describe";
import { KEEP_DAYS, readLog, visitsConnected } from "@/lib/visits/store";
import { placeName, startOfToday, summarize } from "@/lib/visits/summary";
import AdminTabs from "../AdminTabs";

export const metadata = { title: "Visitors", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ show?: string }> };

export default function VisitorsPage({ searchParams }: Props) {
  if (!adminEnabled) notFound();
  return (
    <Suspense fallback={<p className="text-cream/60">Loading…</p>}>
      <Visitors searchParams={searchParams} />
    </Suspense>
  );
}

const card = "glass rounded-3xl p-6 md:p-8";
const label = "font-accent text-[13px] text-cream/60";
const DAY = 24 * 60 * 60 * 1000;
const regions = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => {
  try {
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
};
const clock = new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "numeric", minute: "2-digit", hour12: true });
const dayAndClock = new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

// "Today, 2:14 pm", "Yesterday, 9:05 am", or "Mon 18 Nov, 2:14 pm" (Malaysia time).
function when(ms: number, now: number) {
  const today = startOfToday(now);
  if (ms >= today) return `Today, ${clock.format(ms)}`;
  if (ms >= today - DAY) return `Yesterday, ${clock.format(ms)}`;
  return dayAndClock.format(ms);
}

// Reads the log on every request, after checking the admin is signed in.
async function Visitors({ searchParams }: Props) {
  await connection();
  if (!hasPassword() || !(await isSignedIn())) redirect("/admin");
  const { show } = await searchParams;
  const count = Math.min(500, Math.max(50, Number(show) || 50));

  if (!visitsConnected()) {
    return (
      <>
        <AdminTabs current="visitors" />
        <ConnectGuide />
      </>
    );
  }

  let log: Awaited<ReturnType<typeof readLog>>;
  try {
    log = await readLog(count);
  } catch {
    return (
      <>
        <AdminTabs current="visitors" />
        <div role="alert" className={card}>
          <h1 className="font-display text-3xl">Visitors</h1>
          <p className="mt-4 text-sm text-flame">The visitor log couldn&apos;t be reached. Check your internet connection, and that the two Upstash settings in .env.local are the ones Vercel shows.</p>
        </div>
      </>
    );
  }

  const { now, recent, month } = log;
  const titles = Object.fromEntries((await readProjects()).map((p) => [p.slug, p.title]));
  const stats = summarize(month, now, titles, countryName);

  return (
    <>
      <AdminTabs current="visitors" />
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl">Visitors</h1>
        <p className="mt-3 max-w-2xl text-sm text-cream/60">
          Who opened the live site, newest first. Times are Malaysia time; places are approximate (from the visitor&apos;s internet connection). Visits are
          kept for {KEEP_DAYS} days.
        </p>
      </header>

      <section aria-label="Totals" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat value={stats.today} label="Visits today" />
        <Stat value={stats.week} label="Last 7 days" />
        <Stat value={stats.month} label="Last 30 days" note={stats.month ? `${stats.returning} came back again` : undefined} />
        <Stat value={stats.briefs} label="Briefs sent to Mira" note="Last 30 days" />
      </section>

      {stats.month > 0 && (
        <section aria-label="Last 30 days" className="mt-4 grid gap-4 lg:grid-cols-3">
          <Bars title="Where they came from" rows={stats.sources} total={stats.month} unit="visits" />
          <Bars title="Where they are" rows={stats.countries} total={stats.month} unit="visits" />
          <Bars title="Pages opened most" rows={stats.pages} total={Math.max(...stats.pages.map(([, n]) => n))} unit="times" />
        </section>
      )}

      <section aria-labelledby="log-title" className={`${card} mt-4`}>
        <h2 id="log-title" className="font-display text-2xl">Every visit</h2>
        {recent.length === 0 ? (
          <div className="mt-4 max-w-xl text-sm leading-relaxed text-cream/65">
            <p>No visits yet. Each visit to the live site shows up here a few seconds after it happens.</p>
            <Tips />
          </div>
        ) : (
          <>
            <ol className="mt-4 divide-y divide-cream/10">
              {recent.map((visit) => (
                <VisitRow key={visit.id} visit={visit} now={now} titles={titles} />
              ))}
            </ol>
            {recent.length >= count && count < 500 && (
              // Only the address's ?show changes, so a plain link: the page
              // transition waits for a new page, and this is the same one.
              <Link href={`/admin/visitors?show=${count + 100}`} scroll={false} className="mt-6 inline-block rounded-full border border-cream/20 px-5 py-2.5 font-accent text-[13px] text-cream/80 transition-colors hover:border-gold hover:text-gold">
                Show 100 more
              </Link>
            )}
            <Tips />
          </>
        )}
      </section>
    </>
  );
}

function Stat({ value, label: name, note }: { value: number; label: string; note?: string }) {
  return (
    <div className={card}>
      <p className="font-display text-4xl tabular-nums md:text-5xl">{value}</p>
      <p className={`mt-2 ${label}`}>{name}</p>
      {note && <p className="mt-1 text-xs text-cream/45">{note}</p>}
    </div>
  );
}

// A ranked list with a thin bar under each row, the count written beside it.
function Bars({ title, rows, total, unit }: { title: string; rows: [string, number][]; total: number; unit: string }) {
  return (
    <div className={card}>
      <h2 className={label}>{title}</h2>
      <ul className="mt-4 space-y-3">
        {rows.map(([name, n]) => (
          <li key={name} title={`${name}: ${n} ${unit}`}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="min-w-0 truncate">{name}</span>
              <span className="shrink-0 tabular-nums text-cream/70">{n}</span>
            </div>
            <div aria-hidden className="mt-1.5 h-1.5 rounded-full bg-cream/10">
              <div className="h-full rounded-full bg-spruce" style={{ width: `${Math.max(4, (n / Math.max(total, 1)) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VisitRow({ visit, now, titles }: { visit: Visit; now: number; titles: Record<string, string> }) {
  const seconds = visit.pages.reduce((sum, p) => sum + (p.seconds ?? 0), 0);
  const chip = "rounded-full border border-cream/15 px-2.5 py-1 text-xs text-cream/75";
  return (
    <li className="py-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className={label}>{when(visit.start, now)}</span>
        <span className="font-medium">{placeName(visit.place, countryName)}</span>
        <span className="text-sm text-cream/65">
          {visit.device}, {visit.browser}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={chip}>{visit.source === "Direct or an app" ? "Direct, or from an app" : `From ${visit.source}`}</span>
        {visit.visitNumber > 1 && <span className={chip}>{ordinal(visit.visitNumber)} visit</span>}
        {seconds > 0 && <span className={chip}>{duration(seconds)} in all</span>}
      </div>
      {visit.brief && (
        <p className="mt-3 text-sm text-gold">
          Sent Mira a brief as <span className="font-semibold">{visit.brief.name}</span>, {clock.format(visit.brief.at)}
        </p>
      )}
      <ol aria-label="Pages, in order" className="mt-3 flex flex-wrap gap-1.5">
        {visit.pages.map((page, i) => (
          <li key={i} className="rounded-lg bg-cream/5 px-2.5 py-1.5 text-xs text-cream/80">
            {pageName(page.path, titles)}
            {page.seconds !== undefined && <span className="ml-1.5 tabular-nums text-cream/50">{duration(page.seconds)}</span>}
          </li>
        ))}
      </ol>
    </li>
  );
}

function Tips() {
  return (
    <div className="mt-6 border-t border-cream/10 pt-5 text-xs leading-relaxed text-cream/55">
      <p>
        <span className="text-cream/80">Know which link brought them:</span> add <code className="text-gold">?ref=</code> and a word to links you share, e.g. your
        resume&apos;s link ending in <code className="text-gold">?ref=cv</code> shows here as &quot;From cv&quot;.
      </p>
      <p className="mt-2">
        <span className="text-cream/80">Leave yourself out:</span> open the live site once with <code className="text-gold">?me=1</code> at the end of the address on each
        of your own phones and computers (<code className="text-gold">?me=0</code> undoes it).
      </p>
      <p className="mt-2">
        Names only appear when a visitor gives one to Mira. Browsers set to &quot;Do not track&quot; aren&apos;t logged.
      </p>
    </div>
  );
}

function ConnectGuide() {
  return (
    <div className={`${card} max-w-2xl`}>
      <h1 className="font-display text-3xl">Visitors</h1>
      <p className="mt-4 text-sm leading-relaxed text-cream/75">The visitor log needs a small free database. Once it&apos;s connected, every visit to the live site appears here.</p>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-cream/75 marker:text-gold">
        <li>
          On vercel.com, open this site&apos;s project and its <span className="text-cream">Storage</span> tab. Choose <span className="text-cream">Create Database</span>, then{" "}
          <span className="text-cream">Upstash for Redis</span> (the free plan is plenty), and connect it to the project.
        </li>
        <li>Redeploy the site (or push a change), so the live site picks up the new settings.</li>
        <li>
          In the project&apos;s <span className="text-cream">Settings</span>, under <span className="text-cream">Environment Variables</span>, copy the two ending in{" "}
          <code className="text-gold">KV_REST_API_URL</code> and <code className="text-gold">KV_REST_API_TOKEN</code> (they may start with a prefix such as{" "}
          <code className="text-gold">STORAGE_</code>) into <code className="text-gold">.env.local</code>, then restart <code className="text-gold">npm run dev</code>.
        </li>
      </ol>
    </div>
  );
}
