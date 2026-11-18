"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { usePhone } from "@/lib/usePhone";

function Word({ word, progress, range, from }: { word: string; progress: MotionValue<number>; range: [number, number]; from: number }) {
  const opacity = useTransform(progress, range, [from, 1]);
  return <motion.span style={{ opacity }}>{word} </motion.span>;
}

// A sentence whose words light up one by one as it scrolls through the screen.
// On phones the unlit words are brighter and the sentence is fully lit by the
// time it reaches the lower third, so it never sits half-grey and unreadable.
export default function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const phone = usePhone();
  const { scrollYProgress } = useScroll({ target: ref, offset: phone ? ["start 95%", "end 70%"] : ["start 85%", "end 45%"] });
  const words = text.split(" ");

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <Word key={i} word={word} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} from={phone ? 0.4 : 0.16} />
      ))}
    </p>
  );
}
