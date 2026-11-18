"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import SplitText from "@/components/SplitText";
import { site } from "@/data/site";
import { scrollToY } from "@/lib/scroll";

const EASE = [0.22, 1, 0.36, 1] as const;
const stages = site.journey;
const frames = stages.flatMap((stage, stageIndex) => stage.images.map((image) => ({ ...image, stageIndex })));
const N = frames.length;

// Scroll budget, measured in screen heights.
const INTRO = 0.15; // photos side by side
const EXPAND = 0.45; // first photo settles into its frame
const PER_IMAGE = 0.45; // each photo, including its pause
const END_HOLD = 0.1; // last photo stays before the page moves on
const TOTAL = INTRO + EXPAND + (N - 1) * PER_IMAGE + END_HOLD;
const DWELL = 0.4; // share of each photo's budget spent standing still
const RADIUS = 22; // corner rounding of a settled photo, in px

// Round previous/next buttons: gold on hover, flame while pressed.
const STEP =
  "grid h-11 w-11 place-items-center rounded-full border border-cream/20 transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink active:border-flame active:bg-flame disabled:opacity-30 disabled:hover:border-cream/20 disabled:hover:bg-transparent disabled:hover:text-cream";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Where photos live once settled: the left part of the screen on wide
// layouts (details sit on the right), the top part on phones.
function area(vw: number, vh: number) {
  if (vw >= 1024) return { l: 48, r: vw * 0.56, t: 112, b: vh - 48 };
  return { l: 20, r: vw - 20, t: 140, b: 140 + vh * 0.34 };
}

function layout(p: number, vw: number, vh: number) {
  const u = p * TOTAL;
  const e = ease(clamp01((u - INTRO) / EXPAND));
  const s = Math.min(N - 1, Math.max(0, (u - INTRO - EXPAND) / PER_IMAGE));
  const k = Math.min(Math.floor(s), N - 1);
  const pos = k + ease(clamp01((s - k - DWELL) / (1 - DWELL)));

  const gap = Math.min(18, Math.max(8, vw * 0.012));
  const cardH = Math.min(vh * 0.52, 520);
  const cardW = Math.min(cardH * 0.42, (vw * 0.92 - gap * (N - 1)) / N);
  const x0 = (vw - (N * cardW + (N - 1) * gap)) / 2;
  const a = area(vw, vh);
  return { e, pos, vw, vh, gap, cardW, cardH, x0, a };
}

type Geo = ReturnType<typeof layout>;

// Size of a photo fitted whole inside the settled area.
function fitted(width: number, height: number, vw: number, vh: number) {
  const a = area(vw, vh);
  const k = Math.min((a.r - a.l) / width, (a.b - a.t) / height);
  return { w: width * k, h: height * k };
}

// Scroll position (0-1 through the pinned section) where a photo sits still.
const progressFor = (frame: number) => (INTRO + EXPAND + (frame + DWELL / 2) * PER_IMAGE) / TOTAL;

function Frame({
  frame,
  index,
  geo,
  vw,
  vh,
  reduce,
}: {
  frame: (typeof frames)[number];
  index: number;
  geo: MotionValue<Geo>;
  vw: MotionValue<number>;
  vh: MotionValue<number>;
  reduce: boolean | null;
}) {
  // The element is always its final, settled size, so the photo is drawn at
  // full sharpness. The row of panels is made by scaling and clipping it.
  const width = useTransform([vw, vh], ([vw, vh]: number[]) => fitted(frame.width, frame.height, vw, vh).w);
  const height = useTransform([vw, vh], ([vw, vh]: number[]) => fitted(frame.width, frame.height, vw, vh).h);

  const shape = useTransform(geo, (g) => {
    const f = fitted(frame.width, frame.height, g.vw, g.vh);
    const startScale = Math.max(g.cardW / f.w, g.cardH / f.h);
    const scale = lerp(startScale, 1, g.e);
    const w = lerp(g.cardW, f.w, g.e);
    const h = lerp(g.cardH, f.h, g.e);
    const step = g.a.r - g.a.l + 32;
    const cx = lerp(g.x0 + index * (g.cardW + g.gap) + g.cardW / 2, (g.a.l + g.a.r) / 2 + (index - g.pos) * step, g.e);
    const cy = lerp(g.vh * 0.56, (g.a.t + g.a.b) / 2, g.e);
    const insetX = Math.max(0, (f.w - w / scale) / 2);
    const insetY = Math.max(0, (f.h - h / scale) / 2);
    const r = lerp(14, RADIUS, g.e) / scale;
    return { x: cx - f.w / 2, y: cy - f.h / 2, scale, clip: `inset(${insetY}px ${insetX}px round ${r}px)` };
  });
  const x = useTransform(shape, (s) => s.x);
  const y = useTransform(shape, (s) => s.y);
  const scale = useTransform(shape, (s) => s.scale);
  const clipPath = useTransform(shape, (s) => s.clip);

  return (
    <motion.div style={{ x, y, scale, width, height }} className="absolute left-0 top-0 will-change-transform">
      <motion.div
        initial={reduce ? false : { opacity: 0, filter: "blur(14px)" }}
        animate={{ opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
        transition={{ duration: 1, delay: 0.55 + index * 0.12, ease: EASE }}
        className="absolute inset-0"
      >
        <motion.div style={{ clipPath }} className="absolute inset-0 bg-ink">
          <Image src={frame.src} alt={frame.alt} fill unoptimized priority sizes="60vw" className="object-cover" style={{ objectPosition: frame.position }} />
          <div aria-hidden className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(243_239_221/0.08)]" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// About page: photos start as a row of panels, the first settles into a
// rounded frame, then each photo slides in with its stage's story beside it
// in a glass panel. Tabs jump between chapters; segments jump between photos.
export default function Journey() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const vw = useMotionValue(1440);
  const vh = useMotionValue(900);
  const [frame, setFrame] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useEffect(() => {
    const size = () => {
      vw.set(window.innerWidth);
      vh.set(window.innerHeight);
    };
    size();
    window.addEventListener("resize", size);
    return () => window.removeEventListener("resize", size);
  }, [vw, vh]);

  const geo = useTransform([scrollYProgress, vw, vh], ([p, w, h]: number[]) => layout(p, w, h));
  const e = useTransform(geo, (g) => g.e);
  const pos = useTransform(geo, (g) => g.pos);
  // Once settled, photos are only visible inside their area, so the next one
  // slides in from the area's edge instead of across the details.
  const stageClip = useTransform(geo, (g) => `inset(0px ${(g.vw - g.a.r) * g.e}px 0px ${g.a.l * g.e}px)`);
  const introOpacity = useTransform(e, [0, 0.4], [1, 0]);
  const detailOpacity = useTransform(e, [0.7, 1], [0, 1]);
  const detailPointer = useTransform(detailOpacity, (v) => (v > 0.6 ? "auto" : "none"));

  useMotionValueEvent(pos, "change", (v) => {
    const next = Math.round(v);
    setFrame((f) => (f === next ? f : next));
  });

  const goTo = (target: number) => {
    const section = ref.current!;
    const start = section.getBoundingClientRect().top + window.scrollY;
    scrollToY(start + progressFor(target) * (section.offsetHeight - window.innerHeight), reduce ? 0 : 0.9);
  };

  const current = frames[frame];
  const stage = stages[current.stageIndex];
  const stageStart = (i: number) => frames.findIndex((f) => f.stageIndex === i);

  return (
    <section ref={ref} className="relative -mx-6 -mt-32 md:-mx-12" style={{ height: `${(1 + TOTAL) * 100}svh` }}>
      <h1 className="sr-only">About me</h1>
      {/* Every stage stays available to screen readers */}
      <div className="sr-only">
        {stages.map((s) => (
          <div key={s.org}>
            <h2>{s.org}, {s.role}, {s.period}</h2>
            <p>{s.headline} {s.body}</p>
          </div>
        ))}
      </div>

      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.div style={{ clipPath: stageClip }} className="absolute inset-0">
          {frames.map((f, i) => (
            <Frame key={f.src} frame={f} index={i} geo={geo} vw={vw} vh={vh} reduce={reduce} />
          ))}
        </motion.div>

        {/* Intro: title above the row of photos, chapter list and scroll cue below it */}
        <motion.div style={{ opacity: introOpacity }} className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 pb-7 pt-24 md:px-12 md:pt-28">
          <div>
            <p className="font-accent text-xs md:text-[11px] text-gold">(About)</p>
            <p aria-hidden className="mt-2 font-display text-5xl leading-none md:text-6xl"><SplitText text="About me" /></p>
          </div>

          <div className="flex items-end justify-between gap-6">
            <ol className="hidden gap-10 md:flex">
              {stages.map((s, i) => (
                <li key={s.org} className="border-l border-cream/15 pl-4">
                  <span className="block font-accent text-xs md:text-[10px] text-gold">0{i + 1}</span>
                  <span className="mt-1 block text-sm font-medium">{s.short}</span>
                  <span className="block text-xs text-cream/70 md:text-cream/50">{s.period}</span>
                </li>
              ))}
            </ol>
            <p className="ml-auto flex items-center gap-3 font-accent text-xs md:text-[11px] text-cream/60">
              Scroll to explore
              <span aria-hidden className="relative h-10 w-px overflow-hidden bg-cream/20">
                <span className="scroll-cue absolute inset-x-0 top-0 h-4 bg-gold" />
              </span>
            </p>
          </div>
        </motion.div>

        {/* Glass panel behind the story on wide screens, with the chapter number set large and faint */}
        <motion.div
          aria-hidden
          style={{ opacity: detailOpacity }}
          className="glass absolute hidden overflow-hidden rounded-[2rem] lg:bottom-8 lg:left-[58vw] lg:right-8 lg:top-24 lg:block"
        >
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(224_202_60/0.14),transparent)] blur-2xl" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={current.stageIndex}
              initial={{ opacity: 0, y: reduce ? 0 : 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -30 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="absolute -bottom-10 right-4 font-display text-[16rem] leading-none text-cream/[0.045]"
            >
              0{current.stageIndex + 1}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        {/* Stage tabs: top of the screen on phones, top of the story panel on wide screens */}
        <motion.div
          style={{ opacity: detailOpacity, pointerEvents: detailPointer }}
          role="group"
          aria-label="Journey stages"
          className="absolute inset-x-5 top-20 grid grid-cols-3 rounded-full border border-cream/12 bg-ink/50 p-1 backdrop-blur lg:left-[calc(58vw+2rem)] lg:right-16 lg:top-32"
        >
          {stages.map((s, i) => {
            const on = i === current.stageIndex;
            return (
              <button
                key={s.org}
                type="button"
                onClick={() => goTo(stageStart(i))}
                aria-current={on ? "step" : undefined}
                className={`relative rounded-full px-2 py-2.5 text-center font-accent text-xs transition-colors duration-300 md:text-[11px] ${on ? "text-ink" : "text-cream/70 md:text-cream/55 hover:text-cream"}`}
              >
                {/* The gold pill slides between tabs as the chapter changes */}
                {on && (
                  <motion.span
                    layoutId="journey-tab"
                    className="absolute inset-0 rounded-full bg-gold"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">
                  <span className="hidden xl:inline">0{i + 1} · </span>
                  {s.short}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Story for the photo on screen */}
        <motion.div
          style={{ opacity: detailOpacity, pointerEvents: detailPointer }}
          className="absolute inset-x-5 bottom-5 top-[calc(140px+34svh+20px)] flex flex-col justify-between lg:bottom-16 lg:left-[calc(58vw+2rem)] lg:right-16 lg:top-52"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.stageIndex}
              initial={{ opacity: 0, y: reduce ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -10 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex min-h-0 flex-col lg:my-auto"
            >
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-accent text-xs md:text-[11px]">
                <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-gold">{stage.period}</span>
                <span className="text-cream/70 md:text-cream/50">Chapter 0{current.stageIndex + 1} of 0{stages.length}</span>
              </p>
              <h2 className="mt-4 font-display text-2xl leading-tight md:mt-5 md:text-4xl">{stage.org}</h2>
              <p className="mt-1.5 text-[15px] text-cream/75 md:text-base md:text-cream/60">{stage.role}</p>
              <p className="mt-4 border-l-2 border-gold pl-4 text-lg font-medium leading-snug md:mt-7 md:text-2xl">{stage.headline}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-cream/80 md:mt-4 md:text-base">{stage.body}</p>
              {/* Tags need a tall screen; on short ones they would run into the photo controls. */}
              <ul className="mt-6 hidden flex-wrap gap-2 [@media(min-height:840px)]:md:flex">
                {stage.tags.map((t) => (
                  <li key={t} className="rounded-full border border-spruce bg-spruce/10 px-3 py-1 font-accent text-xs md:text-[10px] text-cream/85">{t}</li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          {/* Step through photos one at a time, or jump straight to one */}
          <div className="mt-4 hidden items-center gap-5 lg:flex">
            <p className="font-accent text-xs md:text-[11px] text-cream/70 md:text-cream/50">
              <span className="text-base text-gold">0{frame + 1}</span> / 0{N}
            </p>
            <div role="group" aria-label="Photos" className="flex flex-1 gap-1.5">
              {frames.map((f, i) => (
                <button
                  key={f.src}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Photo ${i + 1} of ${N}`}
                  aria-current={i === frame ? "true" : undefined}
                  className="group flex-1 py-3"
                >
                  <span className={`block h-0.5 rounded-full transition-colors duration-300 ${i <= frame ? "bg-gold" : "bg-cream/15 group-hover:bg-cream/45"}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => goTo(Math.max(0, frame - 1))} disabled={frame === 0} aria-label="Previous photo" className={STEP}>←</button>
              <button type="button" onClick={() => goTo(Math.min(N - 1, frame + 1))} disabled={frame === N - 1} aria-label="Next photo" className={STEP}>→</button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
