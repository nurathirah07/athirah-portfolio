"use client";
import Image from "next/image";
import { useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { usePhone } from "@/lib/usePhone";

const COLUMNS = 4;
const PER_COLUMN = 4;
// How far each column slides while the band scrolls past (in screen heights),
// and where it starts. Different speeds make the grid shear apart.
const SPEED = [2, 3.3, 1.25, 3];
const START = ["-45%", "-95%", "-45%", "-75%"];

// The screen height, kept up to date as the window resizes.
const watchResize = (update: () => void) => {
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
};
const useScreenHeight = () => useSyncExternalStore(watchResize, () => window.innerHeight, () => 800);

// The photos dealt into columns, repeating if there are fewer than the grid holds.
const deal = (images: string[]) =>
  Array.from({ length: COLUMNS }, (_, c) => Array.from({ length: PER_COLUMN }, (_, r) => images[(r * COLUMNS + c) % images.length]));

function Column({ items, y, start, index, still }: { items: string[]; y: MotionValue<number>; start: string; index: number; still: boolean }) {
  return (
    <motion.div
      style={still ? undefined : { y, top: start }}
      className={`relative flex w-1/2 flex-col gap-[2vw] md:w-1/4 ${index >= 2 ? "hidden md:flex" : ""} ${still ? "" : "will-change-transform"}`}
    >
      {items.map((src, i) => (
        <div key={`${src}-${i}`} className="relative aspect-[2/3] overflow-hidden rounded-[1vw] border border-cream/10">
          <Image src={src} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
        </div>
      ))}
    </motion.div>
  );
}

// A full-width band of tall photo tiles in four columns (two on phones). As it
// scrolls past, each column slides at its own speed. With reduced motion it is
// a plain, still grid. The photos are whatever is in public/images/gallery
// (see galleryImages in src/lib/gallery.ts); they're decoration, so no links.
export default function ParallaxGallery({ images }: { images: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = !!useReducedMotion();
  const phone = usePhone();
  const h = useScreenHeight() * (phone ? 0.5 : 1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, h * SPEED[0]]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, h * SPEED[1]]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, h * SPEED[2]]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, h * SPEED[3]]);
  const ys = [y1, y2, y3, y4];
  if (!images.length) return null;
  const columns = deal(images);

  return (
    <section aria-hidden className="-mx-6 md:-mx-12">
      <div ref={ref} className={`relative flex gap-[2vw] overflow-hidden p-[2vw] ${reduce ? "" : "h-[150vh] md:h-[175vh]"}`}>
        {columns.map((items, c) => (
          <Column key={c} items={items} y={ys[c]} start={START[c]} index={c} still={reduce} />
        ))}
        {/* Fade into the page above and below */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-ink to-transparent" />
      </div>
    </section>
  );
}
