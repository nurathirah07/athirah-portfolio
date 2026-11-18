"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import TransitionLink from "@/components/TransitionLink";
import { careerFacts, site } from "@/data/site";
import { codeView } from "@/lib/codeView";
import { lockScroll } from "@/lib/scroll";
import { siteMode, useSiteMode, type ModePhase } from "@/lib/siteMode";
import { usePhone } from "@/lib/usePhone";

const EASE = [0.22, 1, 0.36, 1] as const;
const ENTER_MS = 1700;
const LEAVE_MS = 1100;
const INK = [0, 15, 8];
const CREAM = [243, 239, 221];
const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(" ")})`;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

// ---- the name in dots ---------------------------------------------------------

type Dot = { x: number; y: number; tx: number; ty: number; vx: number; vy: number; dust: boolean };

/**
 * The name drawn in thousands of dots. On the way in, the dots are scattered
 * across the screen and gather into the letters as the page turns light; on the
 * way out they blow apart again. While it's showing, the dots shy away from the
 * pointer and drift back.
 */
function DotName({ phase }: { phase: ModePhase["name"] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const phone = usePhone();
  const phaseRef = useRef(phase);
  const since = useRef(0);
  useEffect(() => {
    phaseRef.current = phase;
    since.current = performance.now();
  }, [phase]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let dots: Dot[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    const pointer = { x: -9999, y: -9999 };

    // Where the letters are: draw the name off screen and keep a dot wherever it's solid.
    const layout = async () => {
      await document.fonts.load("800 100px Manrope").catch(() => {});
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = c.getBoundingClientRect();
      w = r.width;
      h = r.height;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const lines = w < 700 ? ["Nur Athirah", "Azmi"] : [site.name];
      const off = document.createElement("canvas");
      off.width = Math.ceil(w);
      off.height = Math.ceil(h);
      const o = off.getContext("2d")!;
      o.font = "800 100px Manrope, system-ui, sans-serif";
      const widest = Math.max(...lines.map((l) => o.measureText(l).width));
      const size = Math.min((w * 0.88 * 100) / widest, (h * 0.34) / lines.length);
      o.font = `800 ${size}px Manrope, system-ui, sans-serif`;
      o.textAlign = "center";
      o.textBaseline = "middle";
      o.fillStyle = "#000";
      const lineH = size * 0.95;
      lines.forEach((l, i) => o.fillText(l, w / 2, h * 0.44 + (i - (lines.length - 1) / 2) * lineH));

      const gap = w < 700 ? 3 : 4;
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const points: [number, number][] = [];
      for (let y = 0; y < off.height; y += gap) for (let x = 0; x < off.width; x += gap) if (data[(y * off.width + x) * 4 + 3] > 128) points.push([x, y]);
      const max = phone ? 1400 : 3200;
      while (points.length > max) points.splice(Math.floor(Math.random() * points.length), 1);

      const old = dots;
      // A small random offset per dot, so the letters look stippled rather than printed on a grid.
      dots = points.map(([px, py], i) => ({
        x: old[i]?.x ?? Math.random() * w,
        y: old[i]?.y ?? Math.random() * h,
        tx: px + (Math.random() - 0.5) * gap * 0.9,
        ty: py + (Math.random() - 0.5) * gap * 0.9,
        vx: 0,
        vy: 0,
        dust: false,
      }));
      // Some loose dust around the letters
      for (let i = 0; i < Math.round(points.length * 0.25); i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        dots.push({ x, y, tx: x, ty: y, vx: 0, vy: 0, dust: true });
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const p = phaseRef.current;
      const t = now - since.current;
      // How "light" the page is: 0 dark, 1 cream. Dots go from cream to ink with it.
      const light = p === "entering" ? clamp((t - 200) / 900) : p === "leaving" ? 1 - clamp(t / 700) : p === "story" ? 1 : 0;
      // On the way in the dots drift loosely at first, then are drawn into the letters.
      const gather = clamp((t - 250) / 1200);
      const pull = p === "entering" ? 0.004 + 0.09 * gather * gather : 0.08;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = mix(CREAM, INK, light);

      for (const d of dots) {
        if (p === "leaving") {
          // Blow apart from the middle
          if (!d.vx && !d.vy) {
            const a = Math.atan2(d.y - h / 2, d.x - w / 2) + (Math.random() - 0.5);
            const speed = 4 + Math.random() * 10;
            d.vx = Math.cos(a) * speed;
            d.vy = Math.sin(a) * speed;
          }
          d.x += d.vx;
          d.y += d.vy;
          d.vx *= 0.97;
          d.vy *= 0.97;
        } else {
          d.vx = d.vy = 0;
          // Shy away from the pointer
          const dx = d.x - pointer.x;
          const dy = d.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 90 && dist > 0.1) {
            const push = (90 - dist) * 0.25;
            d.x += (dx / dist) * push;
            d.y += (dy / dist) * push;
          }
          const jitter = p === "entering" ? (1 - gather) * 3.5 : d.dust ? 0.35 : 0.15;
          d.x += (d.tx - d.x) * pull + (Math.random() - 0.5) * jitter;
          d.y += (d.ty - d.y) * pull + (Math.random() - 0.5) * jitter;
        }
        if (d.dust) {
          ctx.globalAlpha = 0.3;
          ctx.fillRect(d.x, d.y, 1.6, 1.6);
          ctx.globalAlpha = 1;
        } else ctx.fillRect(d.x, d.y, 2, 2);
      }
    };

    const move = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const away = () => {
      pointer.x = pointer.y = -9999;
    };
    const resize = () => void layout();
    void layout().then(() => (raf = requestAnimationFrame(frame)));
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerleave", away);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerleave", away);
      window.removeEventListener("resize", resize);
    };
  }, [phone]);

  return <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />;
}

// ---- numbers that settle --------------------------------------------------------

// A number that flickers through random digits, then settles on the true value.
function Settle({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(String(value));
  useEffect(() => {
    if (!seen || reduce) return;
    const digits = String(value).length;
    let n = 0;
    const timer = setInterval(() => {
      n++;
      if (n >= 14) {
        setShown(String(value));
        clearInterval(timer);
      } else setShown(String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, "0"));
    }, 55);
    return () => clearInterval(timer);
  }, [seen, reduce, value]);
  return <span ref={ref} className="tabular-nums">{shown}</span>;
}

// ---- what I do: line drawings ------------------------------------------------------

const draw = { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: 1, ease: EASE } };
// One simple line drawing per service. The outlines draw themselves in; one
// part is filled in spruce.
function Drawing({ index }: { index: number }) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const fill = { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.6, delay: 0.6, ease: EASE } };
  const art = [
    // Web applications: a browser window with a header and cards
    <>
      <motion.rect {...draw} {...line} x="20" y="20" width="360" height="240" rx="14" />
      <motion.path {...draw} {...line} d="M20 58h360" />
      <motion.rect {...fill} x="44" y="78" width="312" height="52" rx="8" className="fill-spruce" />
      {[44, 150, 256].map((x) => (
        <motion.rect key={x} {...draw} {...line} x={x} y="146" width="94" height="94" rx="8" />
      ))}
    </>,
    // Mobile apps: a phone with list rows
    <>
      <motion.rect {...draw} {...line} x="130" y="14" width="140" height="252" rx="24" />
      <motion.rect {...fill} x="148" y="52" width="104" height="48" rx="8" className="fill-spruce" />
      {[116, 150, 184, 218].map((y) => (
        <motion.path key={y} {...draw} {...line} d={`M150 ${y}h100`} />
      ))}
    </>,
    // UI/UX design: a wireframe with one box picked, and the pointer on it
    <>
      {[[30, 30], [150, 30], [270, 30], [30, 150], [270, 150]].map(([x, y]) => (
        <motion.rect key={`${x}-${y}`} {...draw} {...line} x={x} y={y} width="100" height="100" rx="10" />
      ))}
      <motion.rect {...fill} x="150" y="150" width="100" height="100" rx="10" className="fill-spruce" />
      <motion.path {...draw} {...line} d="M222 214l26 62 9-26 26-9z" className="fill-ink" />
    </>,
    // AI features: a label being scanned, with one ingredient picked out
    <>
      {["M40 60V30h30", "M330 30h30v30", "M360 220v30h-30", "M70 250H40v-30"].map((d) => (
        <motion.path key={d} {...draw} {...line} d={d} />
      ))}
      {[90, 126, 198].map((y) => (
        <motion.path key={y} {...draw} {...line} d={`M80 ${y}h240`} />
      ))}
      <motion.rect {...fill} x="80" y="150" width="140" height="28" rx="14" className="fill-spruce" />
      <motion.path {...draw} {...line} d="M40 140h320" className="text-flame" />
    </>,
    // Databases: three tables joined up
    <>
      {[[30, 40], [230, 40], [130, 170]].map(([x, y]) => (
        <motion.g key={`${x}-${y}`}>
          <motion.rect {...draw} {...line} x={x} y={y} width="140" height="90" rx="10" />
          <motion.path {...draw} {...line} d={`M${x} ${y + 28}h140`} />
        </motion.g>
      ))}
      <motion.rect {...fill} x="30" y="40" width="140" height="28" rx="10" className="fill-spruce" />
      <motion.path {...draw} {...line} d="M170 85h60M100 130v40h30M300 130v40h-30" />
    </>,
  ];
  return (
    <svg viewBox="0 0 400 280" aria-hidden className="h-auto w-full text-ink">
      {art[index % art.length]}
    </svg>
  );
}

// The services as tabs that move on by themselves (a line fills under the
// current one), pausing while pointed at or focused.
function Services() {
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [held, setHeld] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box, { amount: 0.4 });
  const running = seen && !held && !reduce;
  const services = site.services;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setCurrent((c) => (c + 1) % services.length), 5000);
    return () => clearTimeout(t);
  }, [running, current, services.length]);
  const s = services[current];

  return (
    <div ref={box} onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45, ease: EASE }}>
            <h3 className="font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-7xl">{s.name}</h3>
            <p className="mt-5 max-w-md text-lg font-medium leading-snug text-ink/75">{s.detail}</p>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.div key={current} exit={{ opacity: 0, filter: "blur(6px)", scale: 0.97 }} transition={{ duration: 0.35 }}>
            <Drawing index={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div role="tablist" aria-label="What I do" className="mt-14 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {services.map((sv, i) => (
          <button
            key={sv.name}
            type="button"
            role="tab"
            aria-selected={i === current}
            onClick={() => setCurrent(i)}
            className="group text-left"
          >
            <span className="relative block h-0.5 overflow-hidden rounded-full bg-ink/15">
              {i === current && (
                <motion.span
                  key={`${current}-${running}`}
                  className="absolute inset-0 origin-left bg-ink"
                  initial={{ scaleX: running ? 0 : 1 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: running ? 5 : 0, ease: "linear" }}
                />
              )}
            </span>
            <span className={`mt-3 block text-sm font-semibold transition-colors ${i === current ? "text-ink" : "text-ink/55 group-hover:text-ink"}`}>{sv.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- the mode ----------------------------------------------------------------------

/**
 * Story mode, opened from the dock: the dark site dissolves into dots, the page
 * turns cream, and the dots gather into the name. Below it, the same person told
 * as a light, editorial page: the statement, the true numbers, and what I do,
 * with drawings. "Site" in the dock, Esc, or going to another page turns it back.
 */
export default function StoryMode() {
  const phase = useSiteMode();
  const path = usePathname();
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const shown = phase.name !== "site";
  const facts = careerFacts();
  const [lead, ...rest] = site.tagline.split(",");

  useEffect(() => {
    if (phase.name === "entering") {
      codeView.send({ type: "NAVIGATE" }); // the Code view belongs to the normal site
      lockScroll(true);
      root.current?.scrollTo({ top: 0 });
      const t = setTimeout(() => siteMode.send({ type: "ARRIVED" }), reduce ? 300 : ENTER_MS);
      return () => clearTimeout(t);
    }
    if (phase.name === "story") root.current?.focus();
    if (phase.name === "leaving") {
      root.current?.scrollTo({ top: 0 });
      const t = setTimeout(() => {
        siteMode.send({ type: "ARRIVED" });
        lockScroll(false);
        document.querySelector<HTMLElement>('[data-dock="story"]')?.focus();
      }, reduce ? 250 : LEAVE_MS);
      return () => clearTimeout(t);
    }
  }, [phase.name, reduce]);

  // The normal site can't be reached by keyboard or screen reader while Story mode covers it.
  useEffect(() => {
    const behind = [document.querySelector("header"), document.getElementById("content"), document.querySelector("footer")];
    behind.forEach((el) => el && (el.inert = shown));
    return () => behind.forEach((el) => el && (el.inert = false));
  }, [shown]);

  useEffect(() => {
    siteMode.send({ type: "NAVIGATE" });
  }, [path]);
  useEffect(() => {
    if (!shown) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && siteMode.send({ type: "ESC" });
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [shown]);
  useEffect(() => () => lockScroll(false), []);

  // The cream page fades in after the dots start gathering, and out as they blow apart.
  const light = phase.name === "entering" || phase.name === "story";

  return (
    <div
      ref={root}
      role="dialog"
      aria-label="Story mode"
      aria-hidden={!shown}
      tabIndex={-1}
      data-phase={phase.name}
      data-lenis-prevent=""
      className="fixed inset-0 z-[130] overflow-y-auto overscroll-contain text-ink outline-none"
      style={{ visibility: shown ? "visible" : "hidden" }}
    >
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: light ? 1 : 0 }}
        transition={{ duration: reduce ? 0.25 : light ? 0.9 : 0.7, delay: light && !reduce ? 0.2 : 0 }}
        className="fixed inset-0 bg-linear-to-b from-[#f7f3e3] to-[#ebe6d0]"
      />
      {/* A faint grain, like the paper panels on the site */}
      <div aria-hidden className="grain pointer-events-none fixed inset-0 opacity-[0.12]" />

      {shown && (
        <div className="relative">
          <section className="relative h-svh min-h-[34rem]">
            {reduce ? (
              <p className="absolute inset-x-0 top-[38%] text-center font-display text-[11vw] font-extrabold leading-none tracking-[-0.05em]">{site.name}</p>
            ) : (
              <DotName phase={phase.name} />
            )}
            <motion.p
              initial={false}
              animate={{ opacity: phase.name === "story" ? 1 : 0, y: phase.name === "story" ? 0 : 12 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="pointer-events-none absolute inset-x-6 top-[66%] text-center text-lg font-semibold text-ink/75 md:text-xl"
            >
              {site.heroLine}
            </motion.p>
          </section>

          <motion.div
            initial={false}
            animate={{ opacity: phase.name === "story" ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="px-6 pb-40 md:px-12"
          >
            <section aria-label="About me" className="mx-auto max-w-6xl border-t border-ink/15 pt-16 md:pt-24">
              <p className="max-w-5xl text-3xl font-medium leading-[1.15] tracking-[-0.02em] md:text-6xl">
                <strong className="font-extrabold">{lead}</strong>
                {rest.length > 0 && `,${rest.join(",")}`}
              </p>
              <dl className="mt-16 grid gap-10 border-t border-ink/15 pt-10 sm:grid-cols-3">
                {facts.map((f) => (
                  <div key={f.label} className="flex flex-col-reverse">
                    <dt className="mt-3 text-sm font-semibold text-ink/60">{f.label}</dt>
                    <dd className="font-display text-7xl font-extrabold leading-none tracking-[-0.04em] md:text-8xl">
                      <Settle value={f.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-label="What I do" className="mx-auto mt-28 max-w-6xl border-t border-ink/15 pt-16 md:mt-36 md:pt-24">
              <Services />
            </section>

            <section aria-label="Next" className="mx-auto mt-28 flex max-w-6xl flex-wrap items-center gap-4 border-t border-ink/15 pt-16 md:mt-36">
              <h2 className="mr-auto font-display text-5xl font-extrabold tracking-[-0.04em] md:text-7xl">Get in touch</h2>
              <TransitionLink href="/contact" className="roll-plain btn-gloss rounded-full px-7 py-3.5 font-accent text-sm">
                Send a message
              </TransitionLink>
              <button
                type="button"
                onClick={() => siteMode.send({ type: "SITE" })}
                className="rounded-full border border-ink/25 px-6 py-3.5 font-accent text-sm transition-colors hover:border-ink hover:bg-ink hover:text-cream"
              >
                Back to the site
              </button>
            </section>
          </motion.div>
        </div>
      )}
    </div>
  );
}
