"use client";
import { useRef } from "react";
import { motion } from "motion/react";
import { Browser, Phone } from "@/components/DeviceFrames";
import TransitionLink from "@/components/TransitionLink";
import ViewButton from "@/components/ViewButton";
import { shotsFor, type Project } from "@/data/site";

// The top of a card: the project's main screen in its device, cropped by the
// card so it reads as a window onto the work. It lifts when the card is hovered.
function Media({ p }: { p: Project }) {
  const [main, second] = p.shots;
  // Website + mobile app: the first of each.
  const [site] = p.platform === "both" ? shotsFor(p, "web") : [];
  const [phone] = p.platform === "both" ? shotsFor(p, "mobile") : [];
  const lift = "transition-transform duration-700 ease-out group-hover:-translate-y-3";

  return (
    <div className="relative h-56 overflow-hidden rounded-2xl border border-cream/10 bg-[#04170e] md:h-60">
      <div aria-hidden className="tech-grid absolute inset-0 opacity-60" />
      <div aria-hidden className="absolute inset-x-[15%] top-[20%] h-full rounded-full bg-[radial-gradient(closest-side,rgb(224_202_60/0.16),transparent)] blur-2xl" />

      {!main ? (
        <div className="absolute inset-0 grid place-items-center">
          <p aria-hidden className="font-display text-7xl text-cream/10">{p.title.split(" ")[0]}</p>
          <span className="absolute bottom-4 left-4 rounded-full border border-cream/15 bg-ink/40 px-3 py-1 font-accent text-[13px] text-cream/70 backdrop-blur">Screenshots coming soon</span>
        </div>
      ) : site && phone ? (
        <>
          <div className={`absolute inset-x-6 right-[22%] top-7 ${lift}`}>
            <Browser shot={site} />
          </div>
          <div className={`absolute right-[7%] top-12 h-[140%] ${lift} delay-75`}>
            <Phone shot={phone} className="h-full rotate-3" />
          </div>
        </>
      ) : p.platform === "mobile" || (p.platform === "both" && phone) ? (
        <>
          {second && (
            <div className={`absolute left-[54%] top-10 h-[150%] ${lift} delay-75`}>
              <Phone shot={second} className="h-full rotate-6 opacity-85" />
            </div>
          )}
          <div className={`absolute left-[22%] top-6 h-[150%] ${lift}`}>
            <Phone shot={main} className="h-full -rotate-3" />
          </div>
        </>
      ) : (
        <div className={`absolute inset-x-6 top-7 ${lift}`}>
          <Browser shot={main} />
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#04170e] to-transparent" />
    </div>
  );
}

// Glass project card with a soft gold spotlight that follows the cursor.
// The whole card opens the project page.
export default function ProjectCard({ p }: { p: Project }) {
  const ref = useRef<HTMLElement>(null);

  const follow = (e: React.PointerEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.article
      ref={ref}
      onPointerMove={follow}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl p-4 glass glass-hover md:p-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgb(224 202 60 / 0.14), transparent 60%)" }}
      />
      {/* Covers the card so all of it opens the project; the cursor shows "View" over it. */}
      <TransitionLink href={`/work/${p.slug}`} aria-hidden tabIndex={-1} data-cursor-label="View" className="absolute inset-0 z-1" />
      <Media p={p} />

      <div className="flex flex-1 flex-col px-2 pb-2 pt-6 md:px-3">
        <p className="flex items-center justify-between text-sm text-cream/70">
          <span>{p.kind}</span>
          <span className="tabular-nums">{p.year}</span>
        </p>
        <h3 className="mt-4 font-display text-2xl leading-tight transition-colors duration-300 group-hover:text-gold md:text-3xl">{p.title}</h3>
        <p className="mb-6 mt-3 text-[15px] leading-relaxed text-cream/80 md:text-sm md:text-cream/75">{p.summary}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4">
          <ul className="flex flex-wrap gap-1.5">
            {p.tech.slice(0, 3).map((t) => (
              <li key={t} className="chip">{t}</li>
            ))}
            {p.tech.length > 3 && <li className="px-1 py-1 text-xs font-semibold text-cream/70">+{p.tech.length - 3} more</li>}
          </ul>
          <ViewButton href={`/work/${p.slug}`} label={`View ${p.title}`} card />
        </div>
      </div>
    </motion.article>
  );
}
