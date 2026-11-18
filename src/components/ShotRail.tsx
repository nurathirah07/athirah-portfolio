"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { Browser, Phone } from "@/components/DeviceFrames";
import RiseText from "@/components/RiseText";
import ShotViewer from "@/components/ShotViewer";
import { deviceOf, type Platform, type Shot } from "@/data/site";

const SPEED = 55; // px per second while drifting
const FRICTION = 3.2; // how quickly a flick dies away (higher = sooner)
const NUDGE = 1500; // px per second given by an arrow button
// Sideways movement before a press counts as a drag, not a tap. Fingers wobble
// (and the strip drifts under them), so touch gets more room than a mouse.
const DRAG_START = { mouse: 6, touch: 14 };

// What the visitor is doing with the strip (shown on the element as data-mode):
// nothing, so it drifts; looking at one screen; or dragging it. One value, so
// "focused and dragged at once" can't happen.
type Mode = { kind: "drifting" } | { kind: "focused"; index: number } | { kind: "dragging" };
const DRIFTING: Mode = { kind: "drifting" };
const DRAGGING: Mode = { kind: "dragging" };

// A project's screens as a strip that drifts sideways on its own.
// - Pointing at a screen (or tapping it) slows the strip to a stop, brings that
//   screen forward and lets the others dim and blur; moving away sets it
//   drifting again.
// - Tapping or clicking the focused screen opens it full size (ShotViewer).
// - To look through faster, drag or swipe the strip, scroll sideways on a
//   trackpad, or use the arrow buttons. It glides on from a flick, then
//   settles back into its own drift.
// With reduced motion it is a plain row you can scroll.
export default function ShotRail({ shots, platform }: { shots: Shot[]; platform: Platform }) {
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const pace = useMotionValue(1); // 1 = drifting, 0 = stopped; eased so it never jerks
  const loop = useRef(0); // width of one full set of screens, in px
  const glide = useRef(0); // extra speed from a flick or arrow, px per second (+ moves right)
  const drag = useRef({ active: false, moved: 0, lastX: 0, lastT: 0, speed: 0 });
  const easing = useRef<ReturnType<typeof animate> | null>(null); // the speed change in progress, if any
  const [mode, setMode] = useState<Mode>(DRIFTING);
  const [viewing, setViewing] = useState<Shot | null>(null); // the screen open full size, if any
  const focus = mode.kind === "focused" ? mode.index : null;
  const grabbing = mode.kind === "dragging";

  // Enough repeats that the strip always overflows the screen, as two equal
  // halves so it can jump by one half without the jump being visible.
  const repeats = Math.max(1, Math.ceil(6 / shots.length));
  const items = Array.from({ length: repeats * 2 }, () => shots).flat();

  // Keeps the strip's position inside one half, whichever way it is moving.
  const wrap = (value: number) => {
    const width = loop.current;
    if (!width) return value;
    return value <= -width ? value + width : value > 0 ? value - width : value;
  };

  useEffect(() => {
    const measure = () => {
      if (track.current) loop.current = track.current.scrollWidth / 2;
    };
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(track.current!);
    return () => watcher.disconnect();
  }, []);

  // Next keeps visited pages alive (hidden). When this page is hidden, clear any
  // focused screen and let the strip drift again, so a return visit starts fresh.
  useLayoutEffect(
    () => () => {
      easing.current?.stop();
      glide.current = 0;
      pace.set(1);
      setMode(DRIFTING);
      setViewing(null);
    },
    [pace],
  );

  useAnimationFrame((_, delta) => {
    if (reduce || !loop.current || drag.current.active) return;
    // Cap the step so a background tab doesn't cause a jump on return.
    const dt = Math.min(delta, 50) / 1000;
    glide.current *= Math.exp(-FRICTION * dt);
    if (Math.abs(glide.current) < 2) glide.current = 0;
    x.set(wrap(x.get() + (glide.current - SPEED * pace.get()) * dt));
  });

  const setPace = (to: number) => {
    easing.current?.stop();
    easing.current = animate(pace, to, { duration: 0.6, ease: "easeOut" });
  };
  const hold = (i: number | null) => {
    setMode(i === null ? DRIFTING : { kind: "focused", index: i });
    setPace(i === null ? 1 : 0);
  };

  // Touch: tapping the screen already in focus opens it full size. Otherwise
  // stop at once and slide the tapped screen to the middle. If that would
  // run past either end of the strip, switch to its twin in the other half first
  // (the two halves look identical, so the switch can't be seen).
  const tap = (i: number, el: HTMLElement) => {
    if (focus === i) return setViewing(items[i]);
    const half = items.length / 2;
    const box = el.getBoundingClientRect();
    let from = x.get();
    let to = from + window.innerWidth / 2 - (box.left + box.width / 2);
    let index = i;
    if (to > 0 && i < half) {
      from -= loop.current;
      to -= loop.current;
      index += half;
    } else if (to <= -loop.current && i >= half) {
      from += loop.current;
      to += loop.current;
      index -= half;
    }
    easing.current?.stop();
    pace.set(0);
    glide.current = 0;
    x.set(from);
    setMode({ kind: "focused", index });
    animate(x, Math.min(to, 0), { duration: 0.6, ease: "easeOut" });
  };

  // Arrow buttons: release any focused screen and send the strip gliding.
  const nudge = (direction: -1 | 1) => {
    hold(null);
    glide.current = direction * NUDGE;
  };

  // Drag or swipe. The page still scrolls up and down as usual (touch-action:
  // pan-y on the stage); only sideways movement moves the strip.
  const press = (e: React.PointerEvent) => {
    if (reduce || (e.pointerType === "mouse" && e.button !== 0)) return;
    const touch = e.pointerType !== "mouse";
    // The screen under the finger, if any: a touch that doesn't turn into a
    // drag focuses it when the finger lifts.
    const shot = (e.target as Element).closest<HTMLElement>("li[data-index]");
    drag.current = { active: false, moved: 0, lastX: e.clientX, lastT: e.timeStamp, speed: 0 };

    const move = (ev: PointerEvent) => {
      const d = drag.current;
      const dx = ev.clientX - d.lastX;
      const dt = Math.max(ev.timeStamp - d.lastT, 1);
      d.moved += Math.abs(dx);
      d.lastX = ev.clientX;
      d.lastT = ev.timeStamp;
      if (!d.active && d.moved > DRAG_START[touch ? "touch" : "mouse"]) {
        d.active = true;
        glide.current = 0;
        setMode(DRAGGING);
      }
      if (d.active) {
        // Smooth the speed over the last few moves so the flick feels natural.
        d.speed = d.speed * 0.6 + ((dx / dt) * 1000) * 0.4;
        x.set(wrap(x.get() + dx));
      }
    };
    const release = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      const d = drag.current;
      if (!d.active) {
        // A tap or click. (pointercancel means the browser took over to scroll the page.)
        if (ev.type !== "pointerup") return;
        if (!shot) return touch ? hold(null) : undefined; // a tap beside the screens lets go
        if (touch) tap(Number(shot.dataset.index), shot);
        else setViewing(items[Number(shot.dataset.index)]); // a mouse has already focused it by pointing
        return;
      }
      d.active = false;
      setMode((m) => (m.kind === "dragging" ? DRIFTING : m));
      // A pause before letting go means "place it here", not a flick.
      const paused = ev.timeStamp - d.lastT > 80;
      glide.current = paused ? 0 : Math.max(-4000, Math.min(4000, d.speed));
      pace.set(0);
      setPace(1);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  };

  // Sideways scrolling (trackpad swipe, or Shift + mouse wheel) moves the strip.
  // Up-and-down scrolling is left alone so the page keeps scrolling.
  useEffect(() => {
    const el = stage.current;
    if (!el || reduce) return;
    const onWheel = (e: WheelEvent) => {
      const sideways = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      if (!sideways || (!e.shiftKey && Math.abs(e.deltaX) <= Math.abs(e.deltaY))) return;
      e.preventDefault();
      e.stopPropagation();
      setMode((m) => (m.kind === "focused" ? DRIFTING : m));
      easing.current?.stop();
      pace.set(0);
      setPace(1);
      x.set(wrap(x.get() - sideways));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // x, pace and the refs are stable for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const arrow =
    "grid h-10 w-10 place-items-center rounded-full border border-cream/20 text-base text-cream/80 transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink active:border-flame active:bg-flame";

  return (
    <section aria-label="Screens" className="relative -mx-6 mt-24 md:-mx-12 lg:mt-32">
      <div className="flex items-end justify-between gap-6 px-6 md:px-12">
        <div>
          <h2 className="font-display text-3xl md:text-5xl">
            <RiseText text="The screens" accent="screens" />
          </h2>
          <p className="mt-2 font-accent text-xs text-cream/70 md:text-cream/50 md:text-[11px]">
            {String(shots.length).padStart(2, "0")} screens ·{" "}
            <span className="hidden sm:inline">Drag to slide · Hover to focus · Click to enlarge</span>
            <span className="sm:hidden">Swipe to slide · Tap to focus, again to enlarge</span>
          </p>
        </div>
        {!reduce && (
          <div className="flex shrink-0 gap-2">
            <button type="button" aria-label="Slide to earlier screens" onClick={() => nudge(1)} className={arrow}>←</button>
            <button type="button" aria-label="Slide to later screens" onClick={() => nudge(-1)} className={arrow}>→</button>
          </div>
        )}
      </div>

      <div
        ref={stage}
        className={`relative mt-6 touch-pan-y select-none py-14 ${reduce ? "overflow-x-auto" : "overflow-x-clip"}`}
        data-lenis-prevent={reduce ? "" : undefined}
        data-mode={mode.kind}
        onPointerDown={press}
        // Mouse only: lifting a finger also "leaves", which would undo a tap.
        onPointerLeave={(e) => e.pointerType === "mouse" && !drag.current.active && hold(null)}
      >
        {/* The room darkens while a screen is in focus. */}
        <div aria-hidden className={`pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgb(0_15_8/0.65)_16%,rgb(0_15_8/0.65)_84%,transparent)] transition-opacity duration-500 ${focus === null ? "opacity-0" : "opacity-100"}`} />

        {/* Images ignore the pointer so pressing one drags the strip, not the picture. */}
        <motion.ul ref={track} style={{ x }} className="relative flex w-max items-center [&_img]:pointer-events-none">
          {items.map((s, i) => {
            const on = focus === i;
            return (
              <li
                key={i}
                // Copies after the first set are only there to fill the loop.
                aria-hidden={i >= shots.length || undefined}
                onPointerEnter={(e) => e.pointerType === "mouse" && !drag.current.active && hold(i)}
                data-index={i}
                onClick={reduce ? () => setViewing(s) : undefined}
                className={`relative shrink-0 px-4 transition-[scale,opacity,filter] duration-500 ease-out md:px-7 ${
                  grabbing ? "scale-[0.97]" : focus === null ? "" : on ? "z-10 scale-110" : "scale-95 opacity-35 blur-[3px]"
                }`}
              >
                {deviceOf(s, platform) === "mobile" ? (
                  <Phone shot={s} className="h-[52svh] min-h-72" />
                ) : (
                  // As wide as the screenshot's shape allows at this height, capped for small screens.
                  <div style={{ width: `min(78vw, calc(44svh * ${s.width / s.height}))` }}>
                    <Browser shot={s} />
                  </div>
                )}
                {/* On the screen in focus: a reminder that it opens full size */}
                {on && (
                  <span aria-hidden className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/40 bg-ink/80 px-3 py-1 font-accent text-xs text-gold md:text-[10px]">
                    <span className="md:hidden">Tap again to enlarge</span>
                    <span className="hidden md:inline">Click to enlarge</span>
                  </span>
                )}
                {/* For keyboards (and with reduced motion): a button per screen */}
                {i < shots.length && (
                  <button
                    type="button"
                    onClick={() => setViewing(s)}
                    className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-1/2 focus-visible:top-4 focus-visible:z-20 focus-visible:-translate-x-1/2 focus-visible:whitespace-nowrap focus-visible:rounded-full focus-visible:bg-gold focus-visible:px-4 focus-visible:py-2 focus-visible:font-accent focus-visible:text-xs focus-visible:text-ink"
                  >
                    Enlarge screen {i + 1}
                  </button>
                )}
              </li>
            );
          })}
        </motion.ul>
      </div>

      <ShotViewer shot={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}
