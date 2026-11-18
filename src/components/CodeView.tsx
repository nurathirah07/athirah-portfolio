"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, animate, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import snippets from "@/data/code-snippets.json";
import { codeView, useCodeView } from "@/lib/codeView";

const PAGE_EASE = [0.76, 0, 0.24, 1] as const;
const COLUMNS = 12; // 6 below lg
const ENTER_MS = 900;
const LEAVE_MS = 650;

type Snippet = { file: string; comment: string; code: string; start: number };
const SNIPPETS = snippets as Record<string, Snippet>;
type Box = { name: string; top: number; left: number; width: number; height: number; pageHeight: number; elements: number };

// ---- live numbers ---------------------------------------------------------

// Everything shown is measured in the visitor's own browser while the view is open.
function useMeasurements(active: boolean) {
  const [m, setM] = useState({ lcp: 0, cls: 0, weight: 0, fps: 0, elements: 0 });
  useEffect(() => {
    if (!active) return;
    let lcp = 0;
    let cls = 0;
    const observers: PerformanceObserver[] = [];
    const watch = (type: string, onEntry: (e: PerformanceEntry) => void) => {
      try {
        const o = new PerformanceObserver((list) => list.getEntries().forEach(onEntry));
        o.observe({ type, buffered: true });
        observers.push(o);
      } catch {
        // not supported in this browser: that number stays at 0
      }
    };
    watch("largest-contentful-paint", (e) => (lcp = e.startTime));
    watch("layout-shift", (e) => {
      const shift = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
      if (!shift.hadRecentInput) cls += shift.value;
    });

    let frames = 0;
    let since = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      frames++;
      if (t - since >= 500) {
        const fps = Math.round((frames * 1000) / (t - since));
        frames = 0;
        since = t;
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        const weight = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).reduce((sum, r) => sum + (r.transferSize || 0), nav?.transferSize ?? 0);
        setM({ lcp, cls, weight, fps, elements: document.getElementsByTagName("*").length });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observers.forEach((o) => o.disconnect());
    };
  }, [active]);
  return m;
}

// A number that counts from its old value to the new one.
function Count({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(0);
  useEffect(() => {
    const run = animate(last.current, value, {
      duration: 0.4,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    last.current = value;
    return () => run.stop();
  }, [value, format]);
  return <span ref={ref} className="tabular-nums">{format(0)}</span>;
}
const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${Math.round(n)} ms`);
const shift = (n: number) => n.toFixed(3);
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`);
const whole = (n: number) => String(Math.round(n));

// ---- code display ----------------------------------------------------------

const KEYWORDS = /^(import|export|default|function|const|let|return|if|else|from|type|await|async|new|true|false|null|undefined|of|for)$/;
// Simple colouring: strings gold, keywords spruce, comments dim.
function Line({ text }: { text: string }) {
  const comment = text.indexOf("//");
  const body = comment >= 0 && !/["'`][^"'`]*\/\//.test(text.slice(0, comment + 2)) ? text.slice(0, comment) : text;
  const rest = body.length < text.length ? text.slice(body.length) : "";
  const parts = body.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b[A-Za-z_]+\b)/);
  return (
    <>
      {parts.map((p, i) =>
        /^["'`]/.test(p) ? (
          <span key={i} className="text-gold">{p}</span>
        ) : KEYWORDS.test(p) ? (
          <span key={i} className="text-[rgb(92_190_174)]">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
      {rest && <span className="text-cream/45">{rest}</span>}
    </>
  );
}

// A section's tag, typed in a letter at a time.
function Typed({ text, start }: { text: string; start: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setN(i);
      if (i >= text.length) clearInterval(timer);
    }, 12);
    return () => clearInterval(timer);
  }, [start, text]);
  return <>{text.slice(0, n)}</>;
}

// ---- the view --------------------------------------------------------------

/**
 * Code view, opened from the dock: the page dims under tall blueprint columns,
 * every marked section (data-code="Name") gets a dashed outline with a tag
 * (its name, height and element count), and a panel slides in with numbers
 * measured live in this browser and the source of the section under the
 * pointer (tap a section on touch screens). Esc, the dock button or a page
 * change closes it. The page keeps scrolling while it's open.
 */
export default function CodeView() {
  const phase = useCodeView();
  const path = usePathname();
  const reduce = useReducedMotion();
  const shown = phase.name !== "off";
  const opening = phase.name === "entering" || phase.name === "on";
  const panel = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const measures = useMeasurements(phase.name === "on");
  // Re-measure the outlines as the page scrolls (set by the effect below while showing).
  const remeasure = useRef<() => void>(() => {});
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", () => remeasure.current());

  // Each phase runs its part, then moves on.
  useEffect(() => {
    if (phase.name === "entering") {
      const t = setTimeout(() => codeView.send({ type: "ENTERED" }), ENTER_MS);
      return () => clearTimeout(t);
    }
    if (phase.name === "on") panel.current?.focus();
    if (phase.name === "leaving") {
      const t = setTimeout(() => {
        codeView.send({ type: "LEFT" });
        document.querySelector<HTMLElement>('[data-dock="code"]')?.focus();
      }, LEAVE_MS);
      return () => clearTimeout(t);
    }
  }, [phase.name]);

  // A page change closes it.
  useEffect(() => {
    codeView.send({ type: "NAVIGATE" });
  }, [path]);

  // While it's showing: keep the outlines on their sections, follow the pointer,
  // let a tap pick a section on touch screens, and close on Esc.
  useEffect(() => {
    if (!shown) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const vh = window.innerHeight;
      const found = [...document.querySelectorAll<HTMLElement>("[data-code]")]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.bottom > -40 && r.top < vh + 40 && r.width > 0)
        .map(({ el, r }) => ({
          name: el.dataset.code!,
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          pageHeight: Math.round(el.offsetHeight),
          elements: el.getElementsByTagName("*").length,
        }));
      setBoxes(found);
      setActive((a) => (a && found.some((b) => b.name === a) ? a : found[0]?.name ?? a));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const inside = (t: EventTarget | null) => t instanceof Node && (panel.current?.contains(t) || (t as Element).closest?.("[data-dock]"));
    const point = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || inside(e.target)) return;
      const name = (e.target as Element).closest?.<HTMLElement>("[data-code]")?.dataset.code;
      if (name) setActive(name);
    };
    let touch = false;
    const down = (e: PointerEvent) => (touch = e.pointerType !== "mouse");
    const tap = (e: MouseEvent) => {
      if (!touch || inside(e.target)) return;
      const name = (e.target as Element).closest?.<HTMLElement>("[data-code]")?.dataset.code;
      if (!name) return;
      e.preventDefault();
      e.stopPropagation();
      setActive(name);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && codeView.send({ type: "ESC" });
    schedule();
    remeasure.current = schedule;
    window.addEventListener("resize", schedule);
    window.addEventListener("pointermove", point);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("click", tap, true);
    window.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(raf);
      remeasure.current = () => {};
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", point);
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("click", tap, true);
      window.removeEventListener("keydown", key);
    };
  }, [shown]);

  const snippet = active ? SNIPPETS[active] : undefined;
  const sweep = (i: number) =>
    reduce
      ? { opacity: opening ? 1 : 0, transition: { duration: 0.3 } }
      : opening
        ? { scaleY: 1, transition: { duration: 0.5, delay: i * 0.035, ease: PAGE_EASE } }
        : { scaleY: 0, transition: { duration: 0.4, delay: 0.25 + (COLUMNS - 1 - i) * 0.025, ease: PAGE_EASE } };

  return (
    <div data-phase={phase.name} aria-hidden={!shown} className="hidden md:block" style={{ visibility: shown ? "visible" : "hidden" }}>
      {/* The page dims */}
      <motion.div
        initial={false}
        animate={{ opacity: opening ? 1 : 0 }}
        transition={{ duration: 0.4, delay: opening ? 0.1 : 0.2 }}
        className="pointer-events-none fixed inset-0 z-[138] bg-ink/55"
      />

      {/* Blueprint columns sweep down (and back up from the bottom when leaving) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[139] flex">
        {Array.from({ length: COLUMNS }, (_, i) => (
          <motion.div
            key={i}
            initial={reduce ? { opacity: 0 } : { scaleY: 0 }}
            animate={shown ? sweep(i) : reduce ? { opacity: 0 } : { scaleY: 0 }}
            style={{ transformOrigin: opening ? "top" : "bottom" }}
            className={`h-full flex-1 border-r border-cream/10 bg-spruce/10 ${i >= 6 ? "hidden lg:block" : ""}`}
          />
        ))}
      </div>

      {/* An outline and a tag on every marked section in view */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: phase.name === "leaving" ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none fixed inset-0 z-[140]"
      >
        {shown &&
          boxes.map((b) => (
            <div
              key={b.name}
              className={`absolute rounded-sm outline-1 outline-offset-0 transition-[outline-color] duration-300 [outline-style:dashed] ${b.name === active ? "outline-gold" : "outline-gold/60"}`}
              style={{ top: b.top, left: b.left, width: b.width, height: b.height }}
            >
              <span className="absolute left-0 top-0 -translate-y-full whitespace-nowrap rounded-t-md bg-ink/90 px-2 py-1 font-mono text-[11px] text-gold">
                <Typed text={`<${b.name}> ${b.pageHeight}px, ${b.elements} elements`} start />
              </span>
            </div>
          ))}
      </motion.div>

      {/* The panel */}
      <motion.div
        ref={panel}
        role="dialog"
        aria-label="Code view"
        tabIndex={-1}
        initial={false}
        animate={reduce ? { opacity: opening ? 1 : 0 } : { x: opening ? "0%" : "110%" }}
        transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 260, damping: 30, delay: opening ? 0.35 : 0 }}
        // Nearly solid, so the page behind never shows through the numbers and code.
        style={{ background: "linear-gradient(180deg, rgb(10 30 22 / 0.97), rgb(2 14 9 / 0.97))" }}
        className="glass-dark fixed bottom-24 right-4 top-20 z-[146] flex w-[380px] flex-col overflow-hidden rounded-3xl text-cream outline-none"
      >
        <div className="border-b border-cream/10 p-5">
          <p className="text-sm text-cream/70">Measured in your browser, right now</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {(
              [
                ["Largest paint", measures.lcp, ms],
                ["Layout shift", measures.cls, shift],
                ["Page weight", measures.weight, kb],
                ["Frames a second", measures.fps, whole],
                ["Elements", measures.elements, whole],
              ] as const
            ).map(([label, value, format]) => (
              <div key={label}>
                <dt className="text-xs text-cream/55">{label}</dt>
                <dd className="mt-0.5 font-display text-lg text-cream">
                  <Count value={value} format={format} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {snippet ? (
              <motion.div
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 overflow-auto p-5"
                data-lenis-prevent=""
              >
                <p className="font-mono text-xs text-gold">{snippet.file}</p>
                {snippet.comment && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-cream/75">{snippet.comment}</p>}
                <pre className="mt-4 font-mono text-[11px] leading-[1.6] text-cream/85">
                  {snippet.code.split("\n").map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <span aria-hidden className="w-6 shrink-0 select-none text-right text-cream/30">{snippet.start + i}</span>
                      <span className="whitespace-pre">
                        <Line text={line} />
                      </span>
                    </div>
                  ))}
                </pre>
              </motion.div>
            ) : (
              <p className="p-5 text-sm text-cream/60">Point at an outlined section to see its code.</p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
