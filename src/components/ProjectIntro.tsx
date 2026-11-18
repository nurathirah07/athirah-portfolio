"use client";
import { motion } from "motion/react";
import RollText from "@/components/RollText";
import TransitionLink from "@/components/TransitionLink";
import VideoBackdrop from "@/components/VideoBackdrop";
import { platformName, type Project } from "@/data/site";

const EASE = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: EASE },
});

// Top of a project page: the project's reel fills the whole first screen
// behind it, and the title, what it is and what it's built with sit over the
// lower left in large, heavy type.
export default function ProjectIntro({ project, index, total }: { project: Project; index: number; total: number }) {
  const facts = [project.kind, project.year, platformName[project.platform]];

  return (
    <section data-code="ProjectIntro" className="relative -mx-6 -mt-32 flex min-h-[38rem] items-end overflow-hidden md:-mx-12 h-svh">
      {/* The reel, dimmed and darker at the edges, fading into the page below */}
      <VideoBackdrop video={project.video} fallback={project.shots[0]} dim={0.5} />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink via-ink/60 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/80 to-transparent" />

      <div className="relative w-full px-6 pb-12 md:px-12 md:pb-16">
        <motion.nav {...rise(0.2)} aria-label="Breadcrumb" className="flex items-center gap-3 text-sm font-semibold text-cream/75">
          <TransitionLink href="/work" className="hover:text-gold"><RollText>Work</RollText></TransitionLink>
          <span aria-hidden className="h-px w-8 bg-cream/35" />
          <span>Project {index + 1} of {total}</span>
        </motion.nav>

        <motion.h1
          {...rise(0.3)}
          className="mt-5 max-w-5xl font-display text-[clamp(3.25rem,11vw,9rem)] font-extrabold leading-[0.9] tracking-[-0.045em] text-cream"
        >
          {project.title}
        </motion.h1>
        <motion.p {...rise(0.4)} className="mt-6 max-w-2xl text-lg font-semibold leading-snug text-cream/90 md:text-2xl">
          {project.summary}
        </motion.p>

        <motion.div {...rise(0.5)} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <ul aria-label="About this project" className="flex flex-wrap gap-2">
            {facts.map((f) => (
              <li key={f} className="glass rounded-full px-4 py-2 text-sm font-semibold text-cream">{f}</li>
            ))}
          </ul>
          <ul aria-label="Built with" className="flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <li key={t} className="chip">{t}</li>
            ))}
          </ul>
          {project.link && (
            <a href={project.link} target="_blank" rel="noreferrer" className="roll-plain btn-gloss rounded-full px-6 py-3 font-accent text-sm">
              <RollText>Visit live site</RollText>
            </a>
          )}
        </motion.div>
      </div>
    </section>
  );
}
