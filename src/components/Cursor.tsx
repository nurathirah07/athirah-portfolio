"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

type Mode = "default" | "link" | "reveal" | "label";

const SIZE: Record<Mode, number> = { default: 12, link: 56, reveal: 96, label: 84 };

// Only for a real mouse. Touch screens (and the server) get nothing at all,
// rather than an animated dot nobody can see.
const MOUSE = "(hover: hover) and (pointer: fine)";
const watchMouse = (update: () => void) => {
  const list = window.matchMedia(MOUSE);
  list.addEventListener("change", update);
  return () => list.removeEventListener("change", update);
};
const hasMouse = () => window.matchMedia(MOUSE).matches;

export default function Cursor() {
  return useSyncExternalStore(watchMouse, hasMouse, () => false) ? <MouseCursor /> : null;
}

// A glowing dot that follows the mouse. It grows over links, and becomes an
// open ring over the portrait so the colour underneath stays visible. Over an
// element with data-cursor-label it becomes a gold badge showing that word,
// e.g. "View" on a project card.
function MouseCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40 });
  const sy = useSpring(y, { stiffness: 500, damping: 40 });
  const [mode, setMode] = useState<Mode>("default");
  const [label, setLabel] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-cursor");

    const update = (el: Element | null) => {
      const word = el?.closest<HTMLElement>("[data-cursor-label]")?.dataset.cursorLabel;
      if (word) setLabel(word);
      setMode(word ? "label" : el?.closest("a, button") ? "link" : el?.closest("[data-cursor='reveal']") ? "reveal" : "default");
    };

    let lastX = -1;
    let lastY = -1;
    const move = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      x.set(lastX);
      y.set(lastY);
      update(e.target as Element);
    };
    // The page can scroll under a still mouse, so re-check what's beneath it.
    const scroll = () => {
      if (lastX >= 0) update(document.elementFromPoint(lastX, lastY));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("scroll", scroll);
      root.classList.remove("has-cursor");
    };
  }, [x, y]);

  const size = SIZE[mode];

  return (
    <motion.div
      aria-hidden
      className="custom-cursor pointer-events-none fixed left-0 top-0 z-300 grid place-items-center overflow-hidden rounded-full border-cream shadow-[0_0_0_1.5px_rgb(0_15_8/0.45)]"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
      animate={{
        width: size,
        height: size,
        borderWidth: mode === "default" || mode === "label" ? 0 : 1,
        backgroundColor: mode === "reveal" ? "rgba(224,202,60,0)" : mode === "link" ? "rgba(224,202,60,0.15)" : "rgba(224,202,60,1)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <span className={`font-accent text-[13px] text-ink transition-opacity duration-200 ${mode === "label" ? "opacity-100" : "opacity-0"}`}>{label}</span>
    </motion.div>
  );
}
