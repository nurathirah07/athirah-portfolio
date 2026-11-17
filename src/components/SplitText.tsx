"use client";
import { motion } from "motion/react";

// Reveals text word by word, each word sliding up from behind a mask.
export default function SplitText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.1em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            // The extra 0.5s lets the page curtain clear before the words rise.
            transition={{ duration: 0.9, delay: 0.5 + delay + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}
