"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import RollText from "@/components/RollText";
import TransitionLink from "@/components/TransitionLink";
import { projects, site } from "@/data/site";

const EASE = [0.22, 1, 0.36, 1] as const;

// Services on the left, every tool on the right. Choosing a service (hover or
// click) opens its description and marks the tools used for it, so the two
// lists explain each other. Which tools belong to which service is set by
// `tools` in site.ts.
export default function SkillsPanel() {
  const [active, setActive] = useState(0);
  const current = site.services[active];
  const used = new Set<string>(current.tools);

  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
      <ul className="border-t border-cream/12">
        {site.services.map((s, i) => {
          const on = i === active;
          const project = projects.find((p) => p.slug === s.project);
          return (
            <li key={s.name} className="border-b border-cream/12">
              <button
                type="button"
                onClick={() => setActive(i)}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                aria-expanded={on}
                className="group flex w-full items-baseline gap-5 py-5 text-left md:gap-8 md:py-6"
              >
                <span className={`flex-1 text-xl font-medium transition-colors duration-300 md:text-3xl ${on ? "text-cream" : "text-cream/70 md:text-cream/45 group-hover:text-cream/80"}`}>
                  {s.name}
                </span>
                {/* Plus turns into a minus on the open row */}
                <span aria-hidden className="relative h-3 w-3 self-center">
                  <span className={`absolute inset-x-0 top-1/2 h-px -translate-y-1/2 ${on ? "bg-gold" : "bg-cream/40"}`} />
                  <span className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-transform duration-300 ${on ? "scale-y-0 bg-gold" : "bg-cream/40"}`} />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-6 pl-9 md:pl-13">
                      <p className="max-w-md text-[15px] leading-relaxed text-cream/80 md:text-base md:text-cream/70">{s.detail}</p>
                      {project && (
                        <TransitionLink href={`/work/${project.slug}`} className="font-accent text-[13px] text-gold">
                          <RollText>{`See ${project.title}`}</RollText>
                        </TransitionLink>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <p className="font-accent text-[13px] text-cream/65">
          <span aria-live="polite">Tools I use for {current.name.toLowerCase()} <span className="text-cream">({used.size})</span></span>
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-x-8 border-t border-cream/12 sm:grid-cols-3">
          {site.skills.map((tool) => {
            const lit = used.has(tool);
            return (
              <li
                key={tool}
                className={`flex items-center gap-2.5 border-b border-cream/12 py-3 text-sm transition-colors duration-300 md:text-base ${lit ? "text-cream" : "text-cream/55 md:text-cream/30"}`}
              >
                <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full transition-[background-color,scale] duration-300 ${lit ? "scale-100 bg-gold" : "scale-50 bg-cream/30"}`} />
                {tool}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
