"use client";
import { useRef } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { site } from "@/data/site";

const EASE = [0.22, 1, 0.36, 1] as const;

// The very bottom of every page: the name set huge, edge to edge, cut off by
// the bottom of the screen. Its letters rise into place as it scrolls in, the
// line moves a little slower than the page, and with a mouse each letter turns
// gold as the pointer passes over it.
export default function FooterName() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  // It sits at the very bottom edge, so count it as seen once a fifth of it shows.
  const seen = useInView(ref, { once: true, amount: 0.2 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-15%", "0%"]);

  return (
    <motion.p
      ref={ref}
      aria-hidden
      style={{ y }}
      className="-mx-6 -mb-[2vw] mt-10 overflow-hidden whitespace-nowrap text-center font-display text-[12.8vw] leading-[0.8] tracking-[-0.04em] text-cream/90 md:-mx-12"
    >
      {[...site.name].map((ch, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block transition-colors duration-300 [@media(hover:hover)]:hover:text-gold"
            initial={false}
            animate={{ y: seen || reduce ? "0%" : "100%" }}
            transition={{ duration: 0.9, delay: reduce ? 0 : i * 0.03, ease: EASE }}
          >
            {ch === " " ? " " : ch /* a plain space collapses inside its own box */}
          </motion.span>
        </span>
      ))}
    </motion.p>
  );
}
