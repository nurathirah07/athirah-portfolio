"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import ColorReveal from "@/components/ColorReveal";
import Dotted from "@/components/Dotted";
import SceneBackground from "@/components/SceneBackground";
import { photos } from "@/data/photos";
import { site } from "@/data/site";

const EASE = [0.22, 1, 0.36, 1] as const;
const AFTER_LOADING = 2.3; // seconds: on a full page load, waits for the loading screen to lift
const AFTER_TRANSITION = 0.5; // seconds: arriving from another page, waits for the page transition
const NAME_COPIES = [0, 1, 2, 3];
// The two echoes are drawn in dots (see Dotted), which read lighter than a
// solid photo, so they sit a little brighter than the photo did.
const ECHOES = [
  { side: -1, drift: 0.95, opacity: 0.42 },
  { side: 1, drift: 0.95, opacity: 0.42 },
];

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // The loading screen only plays in the first seconds after a full page load.
  const [START, setStart] = useState(() => (typeof performance !== "undefined" && performance.now() > 3000 ? AFTER_TRANSITION : AFTER_LOADING));
  // Next keeps visited pages alive (hidden) instead of unmounting them, so this
  // state would otherwise keep the long first-load delay. When the page is
  // hidden, switch to the short delay for every later visit.
  useLayoutEffect(() => () => setStart(AFTER_TRANSITION), []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const nameX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -320]);
  const plusRotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 180]);
  const echoLeftY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -70]);
  const echoRightY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -130]);

  return (
    <section ref={ref} className="relative -mx-6 -mt-32 h-svh min-h-150 overflow-hidden md:-mx-12">
      <h1 className="sr-only">{site.name}, {site.role}</h1>

      {/* Moving gradient that follows the cursor and ripples; sits under everything */}
      <SceneBackground />

      {/* Two faint echoes that slide out from behind the portrait */}
      <div aria-hidden className="fade-bottom pointer-events-none absolute inset-0 hidden justify-center md:flex">
        {ECHOES.map(({ side, drift, opacity }) => (
          <motion.div
            key={side}
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity, x: `${side * 62}%` }}
            transition={{ duration: 1.6, delay: START + 0.4, ease: EASE }}
            className="absolute bottom-0"
          >
            <motion.div style={{ y: side < 0 ? echoLeftY : echoRightY, scale: drift }} className="origin-bottom">
              {/* The echo photo, drawn in dots that part around the pointer */}
              <div className="relative h-[min(88svh,175vw)]" style={{ aspectRatio: `${photos.echo.width} / ${photos.echo.height}` }}>
                <Dotted source={{ kind: "image", src: photos.echo.src }} gap={5} dot={1.8} />
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: START, ease: EASE }}
        className="fade-bottom absolute inset-x-0 bottom-0 flex justify-center"
      >
        <ColorReveal
          src={photos.me.src}
          width={photos.me.width}
          height={photos.me.height}
          alt={`${site.name} in a tan blazer, smiling`}
          style={{ height: "min(88svh, 175vw)" }}
        />
      </motion.div>

      <motion.div
        aria-hidden
        style={{ rotate: plusRotate }}
        className="pointer-events-none absolute left-8 top-[30svh] h-10 w-10 md:left-[22%] md:top-[32svh] md:h-18 md:w-18"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.9, delay: START + 0.3, ease: EASE }}
          className="relative h-full w-full"
        >
          <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-cream md:h-1" />
          <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-cream md:w-1" />
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: START + 0.5 }}
        className="pointer-events-none absolute left-6 top-24 max-w-52 text-sm leading-snug text-cream/85 md:left-auto md:right-[12%] md:top-[44svh]"
      >
        {site.heroLine}
      </motion.p>

      <motion.div
        aria-hidden
        initial={{ y: "130%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, delay: START + 0.2, ease: EASE }}
        style={{ x: nameX }}
        className="pointer-events-none absolute bottom-[3svh] left-0"
      >
        {/* The name in stippled dots that part around the pointer. The text stays,
            invisible, so the line keeps its size and keeps sliding as before. */}
        <div className="name-track flex w-max font-display text-[15vw] font-extrabold leading-none whitespace-nowrap md:text-[13vw]">
          {NAME_COPIES.map((copy) => (
            <span key={copy} className="shrink-0 pr-[0.35em]">
              <span className="relative inline-block text-transparent">
                {site.name} -
                <Dotted source={{ kind: "text", text: `${site.name} -` }} />
              </span>
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
