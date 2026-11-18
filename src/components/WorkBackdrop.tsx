"use client";
import { useEffect, useRef } from "react";
import ScenePhoto from "@/components/ScenePhoto";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";

// Background for the top of the Work page.
// - Dark teal silk (a photograph) that moves slowly, its highlights sliding.
// - An amethyst haze on the far side ties it to the rest of the site.
// - A warm light follows the cursor.
// - A field of fine dots is hidden until the cursor passes over it.
// It fills its parent section, fading out at the bottom, and listens to that section for the pointer.
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
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden mask-[linear-gradient(to_bottom,#000_72%,transparent)]">
      <ScenePhoto src="/images/backgrounds/work.webp" glint={0.35} preload />
      {/* Keep the silk in the background: dim it, darker at the edges */}
      <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/80 to-transparent" />
      <div className="absolute inset-0 bg-ink/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_50%,transparent_30%,rgb(0_15_8/0.75))]" />
      <div className="drift-b absolute -right-[12%] top-[10%] h-[80%] w-[50%] rounded-full bg-[radial-gradient(closest-side,rgb(62_47_91/0.55),transparent)] blur-3xl" />
      <div className="absolute inset-0 grain" />

      {/* Dots that only show near the cursor */}
      <motion.div
        style={{ maskImage: reveal, WebkitMaskImage: reveal }}
        className="absolute inset-0 bg-[radial-gradient(rgb(243_239_221/0.5)_1px,transparent_1.5px)] bg-size-[22px_22px]"
      />

      {/* Light that follows the cursor */}
      <motion.div
        style={{ x, y }}
        className="absolute left-0 top-0 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(224_202_60/0.14),rgb(19_111_99/0.12)_55%,transparent)] blur-2xl"
      />

    </div>
  );
}
