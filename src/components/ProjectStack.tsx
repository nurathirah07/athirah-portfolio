"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { Browser, Phone } from "@/components/DeviceFrames";
import Label from "@/components/Label";
import TransitionLink from "@/components/TransitionLink";
import VideoBackdrop from "@/components/VideoBackdrop";
import ViewButton from "@/components/ViewButton";
import { projects, shotsFor, type Project, type Shot } from "@/data/site";

const N = projects.length;

// Screenshot collage: one large shot with two smaller ones overlapping it,
// which spread apart a little when the card is hovered.
function Collage({ p }: { p: Project }) {
  const shots = p.shots ?? [];

  if (shots.length === 0) {
    return (
      <div className="relative h-full min-h-56 overflow-hidden rounded-2xl border border-cream/10 bg-[radial-gradient(circle_at_30%_20%,rgb(19_111_99/0.55),transparent_60%),radial-gradient(circle_at_80%_90%,rgb(62_47_91/0.7),transparent_60%)]">
        <div aria-hidden className="tech-grid absolute inset-0 opacity-70" />
        <p aria-hidden className="absolute -bottom-4 left-4 right-4 font-display text-[18vw] leading-none text-cream/10 md:text-[7vw]">
          {p.title.split(" ")[0]}
        </p>
        <span className="absolute left-5 top-5 rounded-full border border-cream/15 bg-ink/40 px-3 py-1 font-accent text-[13px] text-cream/70 backdrop-blur">Screenshots coming soon</span>
        {/* A small terminal-style card listing the stack */}
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="w-full max-w-sm rounded-xl border border-cream/10 bg-ink/70 shadow-[0_30px_60px_-25px_rgb(0_0_0/0.9)] backdrop-blur transition-transform duration-700 group-hover:-translate-y-1">
            <div aria-hidden className="flex gap-1.5 border-b border-cream/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-flame/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-spruce" />
            </div>
            <ul aria-label="Built with" className="space-y-1.5 px-5 py-4 font-mono text-xs text-cream/75 md:text-sm">
              <li className="text-cream/70 md:text-cream/40">$ {p.slug} --stack</li>
              {p.tech.map((t) => (
                <li key={t}><span className="text-gold">›</span> {t.toLowerCase()}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (p.platform === "mobile") return <PhoneCollage shots={shots} />;
  if (p.platform === "both") {
    const [web, phones] = [shotsFor(p, "web"), shotsFor(p, "mobile")];
    if (web.length && phones.length) return <ComboCollage web={web} phones={phones} />;
    if (phones.length) return <PhoneCollage shots={phones} />;
  }

  if (shots.length === 1) {
    return (
      <div className="relative h-full min-h-56">
        <Browser shot={shots[0]} fill className="absolute inset-0 transition-transform duration-700 group-hover:-translate-y-1" />
      </div>
    );
  }

  const [main, second, third] = shots;
  return (
    <div className="relative h-full min-h-56">
      <div className="absolute left-0 top-[6%] w-[84%] transition-transform duration-700 ease-out group-hover:-translate-x-2 group-hover:-translate-y-1">
        <Browser shot={main} />
      </div>
      {second && (
        <div className="absolute bottom-[4%] right-0 w-[52%] rotate-2 transition-transform duration-700 ease-out group-hover:translate-x-2 group-hover:translate-y-1 group-hover:rotate-3">
          <Browser shot={second} />
        </div>
      )}
      {third && (
        <div className="absolute right-[4%] top-0 w-[26%] -rotate-3 transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:-rotate-6">
          <Browser shot={third} className="rounded-lg" />
        </div>
      )}
    </div>
  );
}

// Website + mobile app: the site in a browser window at the back, with the
// app's phones standing in front of it. They part a little on hover.
function ComboCollage({ web, phones }: { web: Shot[]; phones: Shot[] }) {
  const [site, secondSite] = web;
  const [phone, secondPhone] = phones;
  return (
    <div className="relative h-full min-h-56">
      <div className="absolute left-0 top-[4%] w-[80%] transition-transform duration-700 ease-out group-hover:-translate-x-2 group-hover:-translate-y-1">
        <Browser shot={site} />
      </div>
      {secondSite && (
        <div className="absolute right-[2%] top-0 w-[30%] -rotate-3 opacity-90 transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:-rotate-6">
          <Browser shot={secondSite} className="rounded-lg" />
        </div>
      )}
      {secondPhone && (
        <div className="absolute bottom-[2%] right-[25%] h-[62%] transition-transform duration-700 ease-out group-hover:-translate-x-3">
          <Phone shot={secondPhone} className="h-full -rotate-6 opacity-90" />
        </div>
      )}
      <div className="absolute bottom-0 right-[4%] z-10 h-[76%] transition-transform duration-700 ease-out group-hover:translate-x-2 group-hover:-translate-y-2">
        <Phone shot={phone} className="h-full rotate-3" />
      </div>
    </div>
  );
}

// Mobile apps: up to three phones, the main screen in front and the next two
// tilted behind it. They fan out a little on hover.
function PhoneCollage({ shots }: { shots: Shot[] }) {
  const [main, left, right] = shots;
  const side = "absolute top-1/2 h-[80%] -translate-x-1/2 -translate-y-1/2";
  return (
    <div className="relative h-full min-h-44">
      <div aria-hidden className="absolute inset-[10%] rounded-full bg-[radial-gradient(closest-side,rgb(224_202_60/0.16),transparent)] blur-2xl" />
      {left && (
        <div className={`${side} left-[24%]`}>
          <div className="h-full -rotate-6 opacity-90 transition-transform duration-700 ease-out group-hover:-translate-x-4 group-hover:-rotate-9">
            <Phone shot={left} className="h-full" />
          </div>
        </div>
      )}
      {right && (
        <div className={`${side} left-[76%]`}>
          <div className="h-full rotate-6 opacity-90 transition-transform duration-700 ease-out group-hover:translate-x-4 group-hover:rotate-9">
            <Phone shot={right} className="h-full" />
          </div>
        </div>
      )}
      <div className="absolute left-1/2 top-1/2 z-10 h-[94%] -translate-x-1/2 -translate-y-1/2">
        <div className="h-full transition-transform duration-700 ease-out group-hover:-translate-y-2">
          <Phone shot={main} className="h-full" />
        </div>
      </div>
    </div>
  );
}

function Card({ p, index, progress }: { p: Project; index: number; progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  // Cards already passed shrink and dim slightly as the next one covers them.
  const scale = useTransform(progress, [index / N, 1], [1, reduce ? 1 : 1 - (N - 1 - index) * 0.04]);
  const dim = useTransform(progress, [index / N, (index + 1) / N], [0, index === N - 1 ? 0 : 0.35]);

  return (
    <div className="sticky flex h-[78svh] min-h-140 items-start" style={{ top: `calc(5.5rem + ${index * 14}px)` }}>
      {/* will-change: the card is scaled on the graphics chip as you scroll, not repainted every frame. */}
      {p.video ? (
        // With a reel: the project plays across the whole card, and the words sit
        // in the middle over a soft dark pool. The whole card opens the project.
        <motion.article
          style={{ scale }}
          className="group relative flex h-full w-full origin-top items-center justify-center overflow-hidden rounded-[1.75rem] glass-solid p-6 text-center will-change-transform md:p-12"
        >
          <VideoBackdrop video={p.video} fallback={p.shots[0]} dim={0.5} dots vignette={false} />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_60%_at_50%_50%,rgb(0_15_8/0.78),rgb(0_15_8/0.35)_70%,transparent)]" />
          <TransitionLink href={`/work/${p.slug}`} aria-hidden tabIndex={-1} data-cursor-label="View" className="absolute inset-0" />

          <div className="pointer-events-none relative flex max-w-4xl flex-col items-center">
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-semibold text-cream/80">
              <span>{p.kind}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-cream/45" />
              <span className="tabular-nums">{p.year}</span>
            </p>
            <h2 className="pointer-events-auto mt-4 font-display text-[clamp(2.75rem,8vw,7rem)] font-extrabold leading-[0.9] tracking-[-0.05em]">
              <TransitionLink href={`/work/${p.slug}`} className="transition-colors duration-300 hover:text-gold">{p.title}</TransitionLink>
            </h2>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-snug text-cream/90 md:text-xl">{p.summary}</p>
            <div className="pointer-events-auto mt-7">
              <ViewButton href={`/work/${p.slug}`} label={`View ${p.title}`} size="lg" />
            </div>
            <ul aria-label="Built with" className="mt-7 flex flex-wrap justify-center gap-2">
              {p.tech.map((t) => (
                <li key={t} className="chip">{t}</li>
              ))}
            </ul>
          </div>

          <motion.div aria-hidden style={{ opacity: dim }} className="pointer-events-none absolute inset-0 bg-ink will-change-[opacity]" />
        </motion.article>
      ) : (
        <motion.article
          style={{ scale }}
          className="group relative grid will-change-transform h-full w-full origin-top grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden rounded-[1.75rem] glass-solid p-6 md:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:grid-rows-1 lg:gap-12"
        >
          <div className="relative flex min-h-0 flex-col">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cream/70">
              <span>{p.kind}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-cream/35" />
              <span className="tabular-nums">{p.year}</span>
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight md:mt-5 md:text-5xl">
              <TransitionLink href={`/work/${p.slug}`} className="transition-colors duration-300 hover:text-gold">{p.title}</TransitionLink>
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-cream/80 md:mt-4 md:text-cream/75 md:text-base">{p.summary}</p>
            <div className="mt-5 md:mt-8">
              <ViewButton href={`/work/${p.slug}`} label={`View ${p.title}`} size="lg" />
            </div>
            <div className="mt-auto pt-4 md:pt-6">
              <div className="hidden md:block"><Label>Built with</Label></div>
              <ul aria-label="Built with" className="flex flex-wrap gap-2 md:mt-3">
                {p.tech.map((t) => (
                  <li key={t} className="chip">{t}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* The screenshots open the project too; the cursor shows "View" over them. */}
          <TransitionLink href={`/work/${p.slug}`} aria-hidden tabIndex={-1} data-cursor-label="View" className="relative block min-h-0">
            <Collage p={p} />
          </TransitionLink>

          <motion.div aria-hidden style={{ opacity: dim }} className="pointer-events-none absolute inset-0 bg-ink will-change-[opacity]" />
        </motion.article>
      )}
    </div>
  );
}

// Projects stacked like cards: each one slides up over the last as you scroll.
export default function ProjectStack() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section id="projects" data-code="ProjectStack" aria-label="Projects" className="relative mt-8">
      <div ref={ref} className="flex flex-col gap-[8svh] pb-[6svh]">
        {projects.map((p, i) => (
          <Card key={p.slug} p={p} index={i} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  );
}
