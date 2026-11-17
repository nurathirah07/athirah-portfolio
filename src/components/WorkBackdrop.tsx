"use client";
import { useEffect, useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";

// Background for the top of the Work page.
// - Three soft colour fields (spruce, amethyst, a little flame) drift slowly.
// - A warm light follows the cursor.
// - A field of fine dots is hidden until the cursor passes over it.
// It fills its parent section and listens to that section for the pointer.
export default function WorkBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 90, damping: 20 });
  const y = useSpring(py, { stiffness: 90, damping: 20 });
  const reveal = useMotionTemplate`radial-gradient(22rem circle at ${x}px ${y}px, #000 0%, transparent 70%)`;

  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    // Start in the middle so there is light before the cursor arrives (and on touch screens).
    const box = host.getBoundingClientRect();
    px.jump(box.width / 2);
    py.jump(box.height * 0.45);
    if (reduce) return;
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      px.set(e.clientX - r.left);
      py.set(e.clientY - r.top);
    };
    host.addEventListener("pointermove", move);
    return () => host.removeEventListener("pointermove", move);
  }, [px, py, reduce]);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="drift-a absolute -left-[10%] top-[5%] h-[70%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgb(19_111_99/0.5),transparent)] blur-3xl" />
      <div className="drift-b absolute -right-[12%] top-[20%] h-[80%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgb(62_47_91/0.75),transparent)] blur-3xl" />
      <div className="drift-c absolute bottom-[-25%] left-[30%] h-[60%] w-[45%] rounded-full bg-[radial-gradient(closest-side,rgb(243_66_19/0.16),transparent)] blur-3xl" />

      {/* Dots that only show near the cursor */}
      <motion.div
        style={{ maskImage: reveal, WebkitMaskImage: reveal }}
        className="absolute inset-0 bg-[radial-gradient(rgb(243_239_221/0.5)_1px,transparent_1.5px)] bg-size-[22px_22px]"
      />

      {/* Light that follows the cursor */}
      <motion.div
        style={{ x, y }}
        className="absolute left-0 top-0 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(224_202_60/0.16),rgb(19_111_99/0.1)_55%,transparent)] blur-2xl"
      />

      {/* Blend into the page below */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-ink to-transparent" />
    </div>
  );
}
