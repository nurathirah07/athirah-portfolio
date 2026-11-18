"use client";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Magnetic from "@/components/Magnetic";
import { codeView, useCodeView } from "@/lib/codeView";

// A small glass pill at the bottom centre of wide screens. It fades in once the
// first screen has mostly scrolled away. For now it holds one button: the Code
// view, which turns the page into a live blueprint of how it's built. (There's
// room beside it for more buttons later.)
export default function Dock() {
  const phase = useCodeView();
  const { scrollY } = useScroll();
  const [shown, setShown] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setShown(y > window.innerHeight * 0.6));
  const on = phase.name === "entering" || phase.name === "on";
  const visible = shown || phase.name !== "off";
  const label = on ? "Hide the code" : "Show the code";

  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 16 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      inert={!visible}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[145] hidden -translate-x-1/2 md:block"
    >
      <Magnetic>
        <div className="glass-dark group/dock relative flex items-center gap-1 rounded-full p-1">
          <button
            type="button"
            data-dock="code"
            onClick={() => codeView.send({ type: "TOGGLE" })}
            aria-pressed={on}
            aria-label={label}
            className={`grid h-10 w-12 place-items-center rounded-full font-mono text-sm transition-colors duration-300 ${on ? "bg-gold text-ink" : "text-cream/80 hover:text-gold"}`}
          >
            {"</>"}
          </button>
          {/* The button's name, shown above it on hover or keyboard focus */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/90 px-3 py-1.5 text-xs text-cream/85 opacity-0 transition-opacity duration-200 group-hover/dock:opacity-100 group-has-focus-visible/dock:opacity-100"
          >
            {label}
          </span>
        </div>
      </Magnetic>
    </motion.div>
  );
}
