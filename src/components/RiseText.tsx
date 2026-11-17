"use client";
import { motion } from "motion/react";

// A heading whose words rise one after another from behind a mask when it
// scrolls into view. Words listed in `accent` are shown in gold.
export default function RiseText({
  text,
  accent = "",
  className,
  delay = 0,
}: {
  text: string;
  accent?: string;
  className?: string;
  delay?: number;
}) {
  const gold = new Set(accent.split(" ").filter(Boolean));

  return (
    <motion.span
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ staggerChildren: 0.07, delayChildren: delay }}
    >
      {text.split(" ").map((word, i) => (
        // The padding keeps descenders (g, y, p) from being cut by the mask.
        <span key={i} aria-hidden className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
          <motion.span
            className={`inline-block ${gold.has(word) ? "text-gold" : ""}`}
            variants={{ hidden: { y: "115%" }, shown: { y: 0 } }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
            {" "}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
