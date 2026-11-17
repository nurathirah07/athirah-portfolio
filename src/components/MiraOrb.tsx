"use client";
import { Component, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import type { Mood } from "@/data/assistant";
import type { Transitions } from "@/lib/machine";
import { useMachine } from "@/lib/useMachine";

// The 3D glass orb needs WebGL, so it loads in the browser only.
const GlassOrb = dynamic(() => import("@/components/GlassOrb"), { ssr: false });

// Which orb is drawn (shown on the element as data-renderer):
// - loading: the 3D glass orb is still loading; the flat orb stands in.
// - glass:   the 3D orb is drawing.
// - flat:    the 3D orb was given up for good on this device (it crashed, or
//            couldn't draw smoothly), so the flat orb stays.
type Renderer = { name: "loading" } | { name: "glass" } | { name: "flat" };
type RendererEvent = { type: "READY" } | { type: "SLOW" } | { type: "CRASHED" };
const flat = (): Renderer => ({ name: "flat" });
const renderers: Transitions<Renderer, RendererEvent> = {
  loading: { READY: () => ({ name: "glass" }), SLOW: flat, CRASHED: flat },
  glass: { SLOW: flat, CRASHED: flat },
  flat: {}, // final: nothing brings the 3D orb back
};

// How her eyes look in each mood, in the eye drawing's own units (a 100-unit
// square). "happy" is drawn separately, as two smiling curves.
const EYES: Record<Exclude<Mood, "happy">, { left: [number, number, number, number]; right: [number, number, number, number]; shift: [number, number]; tilt: number }> = {
  calm: { left: [38, 41, 6.5, 17], right: [55.5, 41, 6.5, 17], shift: [0, 0], tilt: 0 },
  excited: { left: [36.8, 38.5, 8, 21], right: [55.2, 38.5, 8, 21], shift: [0, 0], tilt: 0 },
  curious: { left: [38, 43, 6.5, 15], right: [55.2, 36.5, 7.5, 21], shift: [0, 0], tilt: -7 }, // one brow up, head tilted
  thinking: { left: [38, 44, 6.5, 11], right: [55.5, 44, 6.5, 11], shift: [-7, -9], tilt: 0 }, // glancing up and away
};

// The orb is Mira herself: a glass sphere with two little eyes. The eyes follow
// the cursor, blink, and change with her mood. The sphere swells with her
// voice, rings ripple out while it is hovered, and a click makes her say
// something short.
export default function MiraOrb({
  energy,
  pointer,
  busy,
  pulseKey,
  reduce,
  compact,
  mood,
  aside,
  onPoke,
}: {
  energy: MotionValue<number>;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  busy: boolean;
  pulseKey: string;
  reduce: boolean;
  compact: boolean;
  mood: Mood;
  aside: string | null;
  onPoke: () => void;
}) {
  const level = useSpring(energy, { stiffness: 260, damping: 18 });
  const spin = useMotionValue(0);
  const counter = useTransform(spin, (r) => -r * 1.4);
  const scale = useTransform(level, [0, 1], [1, 1.07]);
  const glow = useTransform(level, [0, 1], [0.35, 0.85]);
  const glowScale = useTransform(level, [0, 1], [0.95, 1.2]);
  const px = useSpring(pointer.x, { stiffness: 120, damping: 20 });
  const py = useSpring(pointer.y, { stiffness: 120, damping: 20 });
  const sheenX = useTransform(px, [-1, 1], ["-28%", "28%"]);
  const sheenY = useTransform(py, [-1, 1], ["-28%", "28%"]);
  const leanX = useTransform(px, [-1, 1], [-10, 10]);
  const leanY = useTransform(py, [-1, 1], [-10, 10]);
  // Where the eyes sit, in the eye drawing's own units; kept inside the sphere.
  const eyeX = useTransform([px, py], ([x, y]: number[]) => (x / Math.max(1, Math.hypot(x, y))) * 23);
  const eyeY = useTransform([px, py], ([x, y]: number[]) => (y / Math.max(1, Math.hypot(x, y))) * 21);
  const [renderer, orb] = useMachine<Renderer, RendererEvent>({ name: "loading" }, renderers);
  const [hovered, setHovered] = useState(false);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const dt = Math.min(delta, 50) / 1000;
    energy.set(energy.get() * Math.exp(-5 * dt)); // each pulse fades away
    spin.set(spin.get() + dt * (10 + 140 * level.get() + (busy ? 40 : 0)));
  });

  return (
    <motion.div
      data-orb
      data-renderer={renderer.name}
      style={{ x: leanX, y: leanY }}
      onPointerEnter={(e) => {
        energy.set(Math.max(energy.get(), 0.5));
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      // Shrinks when a form or summary needs the room.
      className={`relative transition-[width,height,margin] duration-700 ease-out ${compact ? "my-6 h-28 w-28 md:h-36 md:w-36" : "my-8 h-44 w-44 md:h-56 md:w-56"}`}
    >
      {/* Light thrown around the orb */}
      <motion.div
        aria-hidden
        style={{ opacity: glow, scale: glowScale }}
        className="absolute inset-[-30%] rounded-full bg-[radial-gradient(closest-side,rgb(224_202_60/0.5),rgb(243_66_19/0.25)_45%,rgb(62_47_91/0.2)_70%,transparent)] blur-2xl"
      />

      {/* A ring that ripples out when a new question starts */}
      {!reduce && pulseKey && (
        <motion.span
          key={pulseKey}
          aria-hidden
          initial={{ scale: 1, opacity: 0.55 }}
          animate={{ scale: 1.55, opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border border-gold/70"
        />
      )}

      {/* Rings keep rippling out while the orb is hovered */}
      {!reduce && hovered && [0, 0.9].map((delay) => (
        <motion.span
          key={delay}
          aria-hidden
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.75], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, delay, repeat: Infinity, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border border-cream/50"
        />
      ))}

      {/* The 3D glass orb. Until it has loaded, or if the device can't draw it
          (or can't draw it smoothly), the flat orb below stands in. */}
      {renderer.name !== "flat" && (
        <Fallback onError={() => orb.send({ type: "CRASHED" })}>
          <GlassOrb energy={level} still={reduce} onReady={() => orb.send({ type: "READY" })} onSlow={() => orb.send({ type: "SLOW" })} />
        </Fallback>
      )}

      <motion.div aria-hidden style={{ scale }} className={`absolute inset-0 overflow-hidden rounded-full transition-opacity duration-700 ${renderer.name === "glass" ? "opacity-0" : ""} bg-[radial-gradient(circle_at_50%_60%,#0e4d44,#041a13_60%,#000f08_85%)] saturate-150`}>
        <motion.div
          style={{ rotate: spin }}
          className="absolute -inset-1/4 bg-[conic-gradient(from_0deg,#e0ca3c,transparent_18%,#f34213_32%,transparent_46%,#2fb3a0_62%,transparent_78%,#8a6fd1_88%,#e0ca3c)] opacity-90 mix-blend-screen blur-xl"
        />
        <motion.div
          style={{ rotate: counter }}
          className="absolute inset-[18%] bg-[conic-gradient(from_120deg,transparent,#f0de6a_16%,transparent_36%,#ff7a4d_58%,transparent_78%)] opacity-60 mix-blend-screen blur-lg"
        />
        {/* Shade the edges so it reads as a sphere */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_45%,transparent_35%,rgb(0_15_8/0.55)_72%,rgb(0_15_8/0.85))]" />
        {/* Highlight that follows the pointer */}
        <motion.div
          style={{ x: sheenX, y: sheenY }}
          className="absolute left-[22%] top-[14%] h-[30%] w-[38%] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.55),transparent)] blur-md"
        />
        <div className="absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgb(243_239_221/0.35),inset_0_0_0_1px_rgb(243_239_221/0.12),inset_0_-18px_40px_rgb(0_0_0/0.5)]" />
      </motion.div>

      {/* Her eyes: they look toward the cursor, blink, and curve into a smile when she is pleased. */}
      <motion.svg aria-hidden viewBox="0 0 100 100" style={{ scale }} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_0_6px_rgb(243_239_221/0.6)]">
        <motion.g style={{ x: eyeX, y: eyeY }}>
          {mood === "happy" ? (
            <g fill="none" stroke="#f3efdd" strokeWidth="4.2" strokeLinecap="round">
              <path d="M35.5 53 Q41 43.5 46.5 53" />
              <path d="M53.5 53 Q59 43.5 64.5 53" />
            </g>
          ) : (
            <g fill="#f3efdd" transform={`translate(${EYES[mood].shift.join(" ")}) rotate(${EYES[mood].tilt} 50 50)`}>
              {[EYES[mood].left, EYES[mood].right].map(([x, y, w, h], i) => (
                <rect key={i} className="mira-eye" x={x} y={y} width={w} height={h} rx={w / 2} />
              ))}
            </g>
          )}
        </motion.g>
      </motion.svg>

      {/* A short remark beside the conversation: when the orb is clicked, or when she notices something */}
      <AnimatePresence>
        {aside && (
          <motion.p
            key={aside}
            aria-hidden
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="glass pointer-events-none absolute bottom-full left-1/2 z-10 -mb-1 w-max max-w-[80vw] -translate-x-1/2 rounded-2xl px-4 py-1.5 text-center text-xs text-cream md:text-sm"
          >
            {aside}
          </motion.p>
        )}
      </AnimatePresence>

      {/* The whole orb can be clicked or tapped */}
      <button type="button" onClick={onPoke} aria-label="Say hello to Mira" className="absolute inset-0 cursor-pointer rounded-full" />
    </motion.div>
  );
}

// Catches a failure in the 3D orb (no WebGL, lost graphics context), draws
// nothing in its place, and reports it so the flat orb takes over.
class Fallback extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
