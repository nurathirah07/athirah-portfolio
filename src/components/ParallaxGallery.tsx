"use client";
import Image from "next/image";
import { useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import TransitionLink from "@/components/TransitionLink";
import { projects } from "@/data/site";
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

// Every project screenshot, each linking to its project, dealt into columns.
// Built from the project data, so new shots added in /admin show up here too.
const tiles = projects.flatMap((p) => p.shots.map((shot) => ({ shot, slug: p.slug, title: p.title })));
const columns = Array.from({ length: COLUMNS }, (_, c) =>
  Array.from({ length: PER_COLUMN }, (_, r) => tiles[(r * COLUMNS + c) % Math.max(tiles.length, 1)]).filter(Boolean),
);

function Column({ items, y, start, index, still }: { items: typeof tiles; y: MotionValue<number>; start: string; index: number; still: boolean }) {
  return (
    <motion.div
      style={still ? undefined : { y, top: start }}
      className={`relative flex w-1/2 flex-col gap-[2vw] md:w-1/4 ${index >= 2 ? "hidden md:flex" : ""} ${still ? "" : "will-change-transform"}`}
    >
      {items.map(({ shot, slug, title }, i) => (
        <TransitionLink
          key={`${slug}-${i}`}
          href={`/work/${slug}`}
          aria-label={`${title}: view project`}
          data-cursor-label="View"
          className="relative block aspect-[2/3] overflow-hidden rounded-[1vw] border border-cream/10"
        >
          {/* A wide screenshot is cropped into the tall tile, so it is drawn far wider than the tile: ask for a bigger image */}
          <Image
            src={shot.src}
            alt=""
            fill
            sizes={shot.width > shot.height ? "(min-width: 768px) 60vw, 130vw" : "(min-width: 768px) 25vw, 50vw"}
            className="object-cover object-top"
          />
        </TransitionLink>
      ))}
    </motion.div>
  );
}

// A full-width band of tall screenshot tiles in four columns (two on phones).
// As it scrolls past, each column slides at its own speed. With reduced motion
// it is a plain, still grid.
export default function ParallaxGallery() {
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
  if (!tiles.length) return null;

  return (
    <section aria-label="Screens from my projects" data-code="ParallaxGallery" className="-mx-6 md:-mx-12">
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
