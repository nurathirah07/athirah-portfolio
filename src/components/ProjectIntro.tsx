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
// behind it, and the title, what it is and what it's built with sit in the
// middle in large, heavy type.
export default function ProjectIntro({ project, index, total }: { project: Project; index: number; total: number }) {
  const facts = [project.kind, project.year, platformName[project.platform]];

  return (
    <section className="relative -mx-6 -mt-32 flex h-svh min-h-[38rem] items-center justify-center overflow-hidden md:-mx-12">
      {/* The reel, dimmed and darker at the edges, fading into the page below */}
      <VideoBackdrop video={project.video} fallback={project.shots[0]} dim={0.5} />
      {/* Darkest in the middle, behind the words, and fading into the page below */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgb(0_15_8/0.7),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-ink to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/80 to-transparent" />

      <div className="relative flex w-full flex-col items-center px-6 pt-20 text-center md:px-12">
        <motion.nav {...rise(0.2)} aria-label="Breadcrumb" className="flex items-center gap-3 text-sm font-semibold text-cream/75">
          <TransitionLink href="/work" className="hover:text-gold"><RollText>Work</RollText></TransitionLink>
          <span aria-hidden className="h-px w-8 bg-cream/35" />
          <span>Project {index + 1} of {total}</span>
        </motion.nav>

        <motion.h1
          {...rise(0.3)}
          className="mt-5 max-w-6xl font-display text-[clamp(3.25rem,12vw,10rem)] font-extrabold leading-[0.88] tracking-[-0.05em] text-cream"
        >
          {project.title}
        </motion.h1>
        <motion.p {...rise(0.4)} className="mt-7 max-w-3xl text-lg font-semibold leading-snug text-cream/90 md:text-2xl">
          {project.summary}
        </motion.p>

        <motion.div {...rise(0.5)} className="mt-9 flex flex-col items-center gap-4">
          <ul aria-label="About this project" className="flex flex-wrap justify-center gap-2">
            {facts.map((f) => (
              <li key={f} className="glass rounded-full px-4 py-2 text-sm font-semibold text-cream">{f}</li>
            ))}
          </ul>
          <ul aria-label="Built with" className="flex flex-wrap justify-center gap-2">
            {project.tech.map((t) => (
              <li key={t} className="chip">{t}</li>
            ))}
          </ul>
          {project.link && (
            <a href={project.link} target="_blank" rel="noreferrer" className="roll-plain btn-gloss mt-2 rounded-full px-7 py-3.5 font-accent text-sm">
              <RollText>Visit live site</RollText>
            </a>
          )}
        </motion.div>
      </div>
    </section>
  );
}
