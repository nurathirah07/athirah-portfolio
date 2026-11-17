"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import WorkBackdrop from "@/components/WorkBackdrop";
import { projects, workTiles } from "@/data/site";

const EASE = [0.22, 1, 0.36, 1] as const;
const BEAT_MS = 1700;

type Word = { x: number; y: number };
type Tile = { img: number; x: number; y: number; w: number; r: number };

// Each beat moves the two words and swaps the screenshots around them.
// Positions are centre points in % of the stage; tile width is % of its width.
const BEATS: { a: Word; b: Word; tiles: Tile[] }[] = [
  {
    a: { x: 30, y: 40 },
    b: { x: 62, y: 58 },
    tiles: [
      { img: 0, x: 15, y: 20, w: 20, r: -2 },
      { img: 1, x: 82, y: 22, w: 20, r: 2 },
      { img: 2, x: 85, y: 80, w: 16, r: -1 },
      { img: 3, x: 17, y: 78, w: 16, r: 1.5 },
    ],
  },
  {
    a: { x: 50, y: 42 },
    b: { x: 50, y: 58 },
    tiles: [
      { img: 4, x: 18, y: 22, w: 11, r: 2 },
      { img: 5, x: 80, y: 20, w: 19, r: -1.5 },
      { img: 6, x: 85, y: 78, w: 13, r: 1 },
      { img: 7, x: 16, y: 76, w: 19, r: -2 },
      { img: 0, x: 50, y: 86, w: 11, r: 0 },
    ],
  },
  {
    a: { x: 68, y: 32 },
    b: { x: 36, y: 68 },
    tiles: [
      { img: 1, x: 18, y: 28, w: 17, r: 1.5 },
      { img: 4, x: 50, y: 14, w: 10, r: -2 },
      { img: 3, x: 82, y: 70, w: 19, r: 2 },
      { img: 5, x: 64, y: 88, w: 11, r: -1 },
    ],
  },
  {
    a: { x: 34, y: 62 },
    b: { x: 66, y: 40 },
    tiles: [
      { img: 6, x: 81, y: 15, w: 14, r: -1.5 },
      { img: 7, x: 15, y: 27, w: 18, r: 2 },
      { img: 2, x: 85, y: 82, w: 13, r: 1 },
      { img: 0, x: 52, y: 86, w: 16, r: -1 },
    ],
  },
];

// Work page opener, modelled on a kinetic "new project" reel: the title words
// jump between positions on a beat while project screenshots pop in and out.
export default function WorkIntro() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (reduce) return;
    let timer: number | undefined;
    const io = new IntersectionObserver(([entry]) => {
      window.clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => setBeat((b) => (b + 1) % BEATS.length), BEAT_MS);
    });
    io.observe(ref.current!);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [reduce]);

  const current = BEATS[reduce ? 1 : beat];
  const words: [string, Word][] = [
    ["My", current.a],
    ["Projects", current.b],
  ];
  const years = projects.map((p) => Number(p.year));

  return (
    <section ref={ref} className="relative -mx-6 -mt-32 h-svh min-h-140 overflow-hidden md:-mx-12">
      <h1 className="sr-only">My projects</h1>
      <WorkBackdrop />

      <div className="absolute inset-x-0 bottom-24 top-24 [--tile-k:2] md:[--tile-k:1]">
        <AnimatePresence>
          {current.tiles.map((t, i) => {
            const img = workTiles[t.img % workTiles.length];
            if (!img) return null;
            return (
              <motion.div
                key={`${beat}-${i}`}
                initial={{ opacity: 0, scale: 0.7, rotate: t.r * 2 }}
                animate={{ opacity: 1, scale: 1, rotate: t.r }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.55, delay: i * 0.07, ease: EASE }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${t.x}%`, top: `${t.y}%`, width: `min(calc(${t.w}% * var(--tile-k)), 420px)` }}
              >
                <Image
                  src={img.src}
                  width={img.width}
                  height={img.height}
                  alt=""
                  unoptimized
                  priority
                  className="h-auto w-full rounded-lg border border-cream/10 shadow-[0_24px_50px_-20px_rgb(0_0_0/0.9)]"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {words.map(([word, pos], i) => (
          <TrailWord key={word} word={word} pos={pos} order={i} echoes={reduce ? 0 : ECHOES} />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-6 pb-8 font-accent text-[11px] text-cream/60 md:px-12">
        <span>({Math.min(...years)} – {Math.max(...years)})</span>
        <span className="text-right">0{projects.length} projects · Scroll to explore ↓</span>
      </div>
    </section>
  );
}

const ECHOES = 6;
const LETTER_LAG = 0.035; // seconds between neighbouring letters
const ECHO_LAG = 0.04; // seconds between each echo of the same letter

// One title word whose letters travel separately. Every letter is a full-stage
// layer moved by % of the stage, so x/y stay GPU transforms. Each layer draws the
// whole word with only its own letter visible, which keeps the font's spacing.
// Echo copies follow the same path a little later and fade out, so they only
// show as a streak while the letters are moving and sit hidden behind them at rest.
function TrailWord({ word, pos, order, echoes }: { word: string; pos: Word; order: number; echoes: number }) {
  const letters = [...word];
  const layers = letters.flatMap((_, li) =>
    Array.from({ length: echoes + 1 }, (_, k) => ({ li, k })),
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {layers.map(({ li, k }) => {
        const t = k / Math.max(echoes, 1);
        const spring = {
          type: "spring" as const,
          stiffness: 95 - k * 7,
          damping: 14 + k * 0.5,
          delay: li * LETTER_LAG + k * ECHO_LAG,
        };
        return (
          <motion.div
            key={`${li}-${k}`}
            className="absolute inset-0"
            style={{ zIndex: echoes - k }}
            initial={{ x: `${pos.x}%`, y: `${pos.y + 8}%`, opacity: 0 }}
            animate={{ x: `${pos.x}%`, y: `${pos.y}%`, opacity: k === 0 ? 1 : 0.55 * (1 - t) + 0.08 }}
            transition={{ x: spring, y: spring, opacity: { duration: 0.6, delay: 0.5 + order * 0.15 + li * LETTER_LAG } }}
          >
            <span
              className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-heavy text-[8vw] leading-none md:text-[6.4vw] ${
                k === 0 ? "text-cream drop-shadow-[0_6px_30px_rgb(0_15_8/0.9)]" : ""
              }`}
              style={k === 0 ? undefined : { color: mix(t), filter: `blur(${1 + k * 1.4}px)` }}
            >
              {letters.map((ch, j) => (
                <span key={j} style={j === li ? undefined : { visibility: "hidden" }}>
                  {ch}
                </span>
              ))}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// Echo colour: gold near the letter, warming to flame at the tail.
function mix(t: number) {
  const a = [224, 202, 60];
  const b = [243, 66, 19];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${c.join(" ")})`;
}
