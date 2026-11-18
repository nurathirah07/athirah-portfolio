"use client";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import Reveal from "@/components/Reveal";
import { isPortrait, projects, site } from "@/data/site";

// The screenshot shown for each service: taken from the project named in
// site.ts, so it follows whatever images that project has in the admin.
const previews = site.services.map((s) => {
  const shots = projects.find((p) => p.slug === s.project)?.shots ?? [];
  return shots[s.shot ?? 0] ?? shots[0] ?? null;
});

// The list of services, drawn for a light (matte) panel. Hovering a row turns
// it dark and floats a matching project screenshot beside the cursor.
export default function ExpertiseList() {
  const [active, setActive] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 26 });
  const sy = useSpring(y, { stiffness: 260, damping: 26 });
  const shot = active === null ? null : previews[active];

  return (
    <div
      className="relative lg:col-span-2"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => setActive(null)}
    >
      <ul className="border-t border-ink/15">
        {site.services.map((s, i) => (
          <li
            key={s.name}
            onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
            className="group border-b border-ink/15 transition-colors duration-300 hover:bg-ink"
          >
            <Reveal className="grid gap-2 px-3 py-5 md:grid-cols-[auto_1fr_1fr] md:items-center md:gap-8 md:px-5 md:py-6">
              <span className="font-accent text-xs md:text-[11px] text-ink/45 transition-colors duration-300 group-hover:text-gold">0{i + 1}</span>
              <h3 className="text-xl font-semibold transition-[color,translate] duration-300 group-hover:translate-x-2 group-hover:text-gold md:text-2xl">{s.name}</h3>
              <p className="text-[15px] leading-relaxed text-ink/75 md:text-sm md:leading-normal md:text-ink/65 transition-colors duration-300 group-hover:text-cream/75">{s.detail}</p>
            </Reveal>
          </li>
        ))}
      </ul>

      {/* Floating preview: sits just right of the cursor, tilted slightly. */}
      <motion.div aria-hidden style={{ x: sx, y: sy }} className="pointer-events-none absolute left-0 top-0 z-20 hidden md:block">
        <AnimatePresence>
          {shot && (
            <motion.div
              key={shot.src}
              initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: -3 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute left-8 -translate-y-1/2 overflow-hidden rounded-2xl border-4 border-cream bg-ink shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] ${isPortrait(shot) ? "h-72 w-36" : "h-44 w-72"}`}
            >
              <Image src={shot.src} alt="" fill sizes="288px" className="object-cover object-top" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
