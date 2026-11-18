"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import type { Mood } from "@/data/assistant";

// How her eyes look in each mood, in the eye drawing's own units (a 100-unit
// square). "happy" is drawn separately, as two smiling curves.
const EYES: Record<Exclude<Mood, "happy">, { left: [number, number, number, number]; right: [number, number, number, number]; shift: [number, number]; tilt: number }> = {
  calm: { left: [39, 45, 6.5, 14], right: [54.5, 45, 6.5, 14], shift: [0, 0], tilt: 0 },
  excited: { left: [38, 43, 8, 17], right: [54, 43, 8, 17], shift: [0, 0], tilt: 0 },
  curious: { left: [39, 47, 6.5, 12], right: [54.2, 41.5, 7.5, 18], shift: [0, 0], tilt: -7 }, // one brow up, head tilted
  thinking: { left: [39, 47, 6.5, 9], right: [54.5, 47, 6.5, 9], shift: [-6, -8], tilt: 0 }, // glancing up and away
};

// Her shape is never a perfect circle: it drifts between these, like a drop of water.
const BLOB = [
  "50% 50% 50% 50% / 50% 50% 50% 50%",
  "54% 46% 52% 48% / 47% 53% 47% 53%",
  "47% 53% 45% 55% / 54% 46% 53% 47%",
  "52% 48% 55% 45% / 50% 55% 45% 50%",
  "50% 50% 50% 50% / 50% 50% 50% 50%",
];

// Mira: a drop of liquid glass with two little eyes, floating above a still
// surface. A clear, thick rim holds a dark core lit by her colours (gold,
// flame, teal, violet). She bobs gently, her reflection and shadow move with
// her, and rings spread across the surface below.
//
// Interactive:
// - her eyes follow the cursor, blink, and change with her mood;
// - her body wobbles with her voice (louder = more);
// - hovering makes her jiggle; clicking or tapping makes her squash and say
//   something short;
// - she can be dragged: she stretches as she moves and springs back home.
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
  const px = useSpring(pointer.x, { stiffness: 120, damping: 20 });
  const py = useSpring(pointer.y, { stiffness: 120, damping: 20 });

  // Body motion, worked out every frame below.
  const bob = useMotionValue(0); // -1 (down) to 1 (up)
  const squashX = useMotionValue(1);
  const squashY = useMotionValue(1);
  const swirl = useMotionValue(0); // the light turning inside her core, degrees
  const wobble = useRef({ amount: 0, phase: 0, angle: 0 }); // a jiggle that dies away
  const dragged = useRef(false);
  const [splashes, setSplashes] = useState<string[]>([]); // extra rings, from pokes

  const floatY = useTransform(bob, (b) => `${-b * 7}%`);
  const shadowScale = useTransform(bob, [-1, 1], [1, 0.78]);
  const shadowOpacity = useTransform(bob, [-1, 1], [0.55, 0.32]);
  const reflectY = useTransform(bob, (b) => `${b * 7}%`);
  const counterSwirl = useTransform(swirl, (r) => -r * 1.3);
  const glow = useTransform(level, [0, 1], [0.22, 0.6]);
  const coreLight = useTransform(level, [0, 1], [0.55, 1]);
  // Eyes and highlight lean toward the cursor; the eyes stay inside the core.
  const eyeX = useTransform([px, py], ([x, y]: number[]) => (x / Math.max(1, Math.hypot(x, y))) * 10);
  const eyeY = useTransform([px, py], ([x, y]: number[]) => (y / Math.max(1, Math.hypot(x, y))) * 8);
  const shineX = useTransform(px, [-1, 1], ["-10%", "10%"]);
  const shineY = useTransform(py, [-1, 1], ["-8%", "8%"]);
  const leanX = useTransform(px, [-1, 1], [-8, 8]);
  const tilt = useTransform(px, [-1, 1], [-6, 6]);

  const jiggle = (amount: number) => {
    wobble.current.amount = Math.max(wobble.current.amount, amount);
  };

  useAnimationFrame((time, delta) => {
    if (reduce) return;
    const dt = Math.min(delta, 50) / 1000;
    const t = time / 1000;
    energy.set(energy.get() * Math.exp(-5 * dt)); // each voice pulse fades away
    bob.set(Math.sin(t * 1.9));
    swirl.set(swirl.get() + dt * (14 + 120 * level.get() + (busy ? 30 : 0)));

    // A jiggle: a quick squash-and-stretch that settles, like jelly.
    const w = wobble.current;
    w.amount *= Math.exp(-3.2 * dt);
    w.phase += dt * 16;
    const jelly = w.amount * Math.sin(w.phase) * 0.14;
    // Talking: a gentle pulse with her voice. Floating: a slow breath.
    const voice = level.get() * Math.sin(t * 13) * 0.05;
    const breath = Math.sin(t * 1.9 + 1.2) * 0.012;
    const s = jelly + voice + breath;
    squashX.set(1 + s);
    squashY.set(1 - s * 0.9);
  });

  const size = compact ? "h-24 w-24 md:h-28 md:w-28" : "h-36 w-36 md:h-44 md:w-44";

  return (
    <motion.div
      data-orb
      style={{ x: leanX }}
      // Shrinks when a form or summary needs the room. Extra room below is the surface.
      className={`relative transition-[width,height,margin] duration-700 ease-out ${size} ${compact ? "mb-12 mt-4" : "mb-16 mt-6 md:mb-20"}`}
    >
      {/* ---- The surface below her ---- */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[112%] h-0 w-0">
        {/* Rings spreading across the surface: always slowly, plus one for each new line and each poke */}
        <svg viewBox="-200 -50 400 100" className="absolute left-1/2 top-1/2 h-[30vw] max-h-64 w-[min(130vw,46rem)] -translate-x-1/2 -translate-y-1/2 overflow-visible">
          {!reduce &&
            [0, 1.4, 2.8].map((delay) => (
              <motion.ellipse
                key={delay}
                cx={0}
                cy={0}
                rx={190}
                ry={42}
                fill="none"
                stroke="rgb(243 239 221)"
                strokeWidth={1.2}
                initial={{ scale: 0.12, opacity: 0 }}
                animate={{ scale: [0.12, 1], opacity: [0, 0.32, 0] }}
                transition={{ duration: 4.2, delay, repeat: Infinity, ease: "easeOut", times: [0, 0.2, 1] }}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            ))}
          {!reduce &&
            [pulseKey, ...splashes].filter(Boolean).map((key) => (
              <motion.ellipse
                key={key}
                cx={0}
                cy={0}
                rx={190}
                ry={42}
                fill="none"
                stroke="rgb(224 202 60)"
                strokeWidth={1.6}
                initial={{ scale: 0.1, opacity: 0.7 }}
                animate={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 1.8, ease: "easeOut" }}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            ))}
        </svg>
      </div>

      {/* Her shadow, which tightens as she rises */}
      <motion.div
        aria-hidden
        style={{ scaleX: shadowScale, opacity: shadowOpacity }}
        className="pointer-events-none absolute left-[14%] right-[14%] top-[108%] h-[9%] rounded-[50%] bg-black blur-md"
      />

      {/* Her reflection on the surface: a faint, upside-down copy that fades out */}
      <motion.div
        aria-hidden
        style={{ y: reflectY }}
        className="pointer-events-none absolute inset-x-[10%] top-[106%] h-[55%] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
      >
        <div className="h-full w-full -scale-y-100 rounded-[50%] bg-[radial-gradient(circle_at_50%_60%,#1a5a50,#06261c_55%,transparent_75%)] blur-[3px]" />
      </motion.div>

      {/* ---- Mira ---- */}
      <motion.div style={{ y: floatY }} className="absolute inset-0">
        <motion.button
          type="button"
          aria-label="Say hello to Mira"
          // Dragging: she follows, stretching a little, then springs back home.
          drag={!reduce}
          dragSnapToOrigin
          dragElastic={0.45}
          dragTransition={{ bounceStiffness: 320, bounceDamping: 12 }}
          whileDrag={{ cursor: "grabbing" }}
          onDragStart={() => {
            dragged.current = true;
            jiggle(0.6);
          }}
          onDrag={(_, info) => {
            const speed = Math.min(1, Math.hypot(info.velocity.x, info.velocity.y) / 2500);
            jiggle(speed);
          }}
          onDragEnd={() => {
            jiggle(1);
            setTimeout(() => (dragged.current = false), 0);
          }}
          onClick={() => {
            if (dragged.current) return; // a drag ends with a click too
            jiggle(1.2);
            setSplashes((s) => [...s.slice(-3), `poke-${Date.now()}`]);
            onPoke();
          }}
          onPointerEnter={(e) => {
            if (e.pointerType !== "mouse") return;
            energy.set(Math.max(energy.get(), 0.4));
            jiggle(0.5);
          }}
          style={{ rotate: tilt, scaleX: squashX, scaleY: squashY, touchAction: "none" }}
          className="absolute inset-0 block cursor-grab rounded-full outline-offset-4"
        >
          {/* Light she throws around her */}
          <motion.span
            aria-hidden
            style={{ opacity: glow }}
            className="pointer-events-none absolute inset-[-28%] rounded-full bg-[radial-gradient(closest-side,rgb(224_202_60/0.35),rgb(47_179_160/0.2)_50%,transparent)] blur-2xl"
          />

          {/* The glass: a thick, clear rim that wobbles like water */}
          <motion.span
            aria-hidden
            animate={reduce ? undefined : { borderRadius: BLOB }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_50%,rgb(243_239_221/0.06)_56%,rgb(243_239_221/0.3)_68%,rgb(243_239_221/0.72)_85%,rgb(255_255_255/0.95)_97%)] shadow-[inset_0_-10px_24px_rgb(0_15_8/0.35),inset_0_8px_18px_rgb(255_255_255/0.35),0_18px_40px_-14px_rgb(0_0_0/0.8)] backdrop-blur-[2px]"
          >
            {/* The dark core, lit from inside by her colours */}
            <motion.span
              animate={reduce ? undefined : { borderRadius: [...BLOB].reverse() }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-[11%] overflow-hidden rounded-full bg-[radial-gradient(circle_at_42%_36%,#1d5e53_0%,#0b2b24_45%,#02140d_82%)] shadow-[inset_0_0_14px_rgb(0_0_0/0.6)]"
            >
              <motion.span
                style={{ rotate: swirl, opacity: coreLight }}
                className="absolute -inset-1/4 bg-[conic-gradient(from_0deg,rgb(224_202_60/0.55),transparent_20%,rgb(243_66_19/0.4)_35%,transparent_50%,rgb(47_179_160/0.55)_65%,transparent_80%,rgb(138_111_209/0.5)_90%,rgb(224_202_60/0.55))] mix-blend-screen blur-xl"
              />
              <motion.span
                style={{ rotate: counterSwirl }}
                className="absolute inset-[15%] bg-[conic-gradient(from_140deg,transparent,rgb(240_222_106/0.35)_18%,transparent_40%,rgb(47_179_160/0.35)_65%,transparent_85%)] mix-blend-screen blur-lg"
              />
              {/* Shade the core's edge so it reads as round */}
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_45%,rgb(0_15_8/0.65)_85%)]" />
            </motion.span>

            {/* Highlights on the glass: a soft one at the top left (it follows the cursor) and a thin one below */}
            <motion.span
              style={{ x: shineX, y: shineY }}
              className="absolute left-[14%] top-[9%] h-[26%] w-[40%] -rotate-[28deg] rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_255_255/1),rgb(255_255_255/0.5)_55%,transparent)] blur-[1.5px]"
            />
            <span className="absolute bottom-[7%] left-[30%] h-[7%] w-[40%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_255_255/0.45),transparent)] blur-[1px]" />
          </motion.span>

          {/* Her eyes: they look toward the cursor, blink, and curve into a smile when she is pleased */}
          <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_0_5px_rgb(255_255_255/0.75)]">
            <motion.g style={{ x: eyeX, y: eyeY }}>
              {mood === "happy" ? (
                <g fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
                  <path d="M37 56 Q42.5 47 48 56" />
                  <path d="M52 56 Q57.5 47 63 56" />
                </g>
              ) : (
                <g fill="#ffffff" transform={`translate(${EYES[mood].shift.join(" ")}) rotate(${EYES[mood].tilt} 50 50)`}>
                  {[EYES[mood].left, EYES[mood].right].map(([x, y, w, h], i) => (
                    <rect key={i} className="mira-eye" x={x} y={y} width={w} height={h} rx={w / 2} />
                  ))}
                </g>
              )}
            </motion.g>
          </svg>
        </motion.button>

        {/* A short remark above her: when she's poked, or when she notices something */}
        <AnimatePresence>
          {aside && (
            <motion.p
              key={aside}
              aria-hidden
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="glass pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[80vw] -translate-x-1/2 rounded-2xl px-4 py-1.5 text-center text-xs text-cream md:text-sm"
            >
              {aside}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
