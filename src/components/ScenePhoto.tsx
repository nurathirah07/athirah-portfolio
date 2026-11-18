"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

// A photograph used as a moving backdrop.
// - The picture pans and zooms very slowly.
// - A mirrored copy drifts the other way on top, so highlights travel.
// - The whole thing leans a little away from the cursor (parallax).
// It fills its parent and listens to the parent's parent for the pointer,
// so content laid over it doesn't block the effect.
export default function ScenePhoto({
  src,
  glint = 0.3,
  position = "50% 50%",
  preload = false,
}: {
  src: string;
  // Opacity of the mirrored copy that makes the light move.
  glint?: number;
  position?: string;
  preload?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const x = useSpring(tx, { stiffness: 40, damping: 18 });
  const y = useSpring(ty, { stiffness: 40, damping: 18 });

  useEffect(() => {
    const host = ref.current?.parentElement?.parentElement;
    if (!host || reduce) return;
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      tx.set(((e.clientX - r.left) / r.width - 0.5) * -28);
      ty.set(((e.clientY - r.top) / r.height - 0.5) * -18);
    };
    host.addEventListener("pointermove", move);
    return () => host.removeEventListener("pointermove", move);
  }, [tx, ty, reduce]);

  return (
    <motion.div ref={ref} style={{ x, y }} className="absolute -inset-8">
      <div className="scene-pan absolute inset-0">
        <Image src={src} alt="" fill sizes="100vw" preload={preload} className="object-cover" style={{ objectPosition: position }} />
      </div>
      <div className="scene-pan-b absolute inset-0 mix-blend-screen" style={{ opacity: glint }}>
        <Image src={src} alt="" fill sizes="100vw" className="object-cover" style={{ objectPosition: position }} />
      </div>
    </motion.div>
  );
}
