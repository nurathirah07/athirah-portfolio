"use client";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Browser, Phone } from "@/components/DeviceFrames";
import RollText from "@/components/RollText";
import TransitionLink from "@/components/TransitionLink";
import { platformName, shotsFor, type Project } from "@/data/site";

const EASE = [0.22, 1, 0.36, 1] as const;
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: EASE },
});

// Top of a project page: the story on the left, and the project's main screen
// on the right in its device, which leans toward the cursor.
export default function ProjectIntro({ project, index, total }: { project: Project; index: number; total: number }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0); // pointer position over the stage, -0.5 to 0.5
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 16 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [9, -9]), { stiffness: 120, damping: 16 });
  const glowX = useTransform(px, [-0.5, 0.5], ["20%", "80%"]);
  const glowY = useTransform(py, [-0.5, 0.5], ["20%", "80%"]);

  const [main, second] = project.shots;
  // Website + mobile app: the first of each, shown together.
  const [site] = project.platform === "both" ? shotsFor(project, "web") : [];
  const [phone] = project.platform === "both" ? shotsFor(project, "mobile") : [];
  const mobile = project.platform === "mobile" || (project.platform === "both" && !site);

  return (
    <section className="grid items-center gap-12 lg:min-h-[calc(100svh-12rem)] lg:grid-cols-[1fr_1.05fr] lg:gap-16">
      <div>
        <motion.nav {...rise(0.2)} aria-label="Breadcrumb" className="flex items-center gap-3 font-accent text-[13px] text-cream/65">
          <TransitionLink href="/work" className="hover:text-gold"><RollText>Work</RollText></TransitionLink>
          <span aria-hidden className="h-px w-8 bg-cream/25" />
          <span>Project {index + 1} of {total}</span>
        </motion.nav>

        <motion.h1 {...rise(0.3)} className="mt-6 font-display text-5xl leading-[1.02] md:text-7xl">
          {project.title}
        </motion.h1>
        <motion.p {...rise(0.4)} className="mt-6 max-w-xl text-lg leading-relaxed text-cream/80 md:text-xl">
          {project.summary}
        </motion.p>

        <motion.dl {...rise(0.5)} className="mt-10 grid grid-cols-3 divide-x divide-cream/10 border-y border-cream/10">
          {[
            ["Type", project.kind],
            ["Year", project.year],
            ["Platform", platformName[project.platform]],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-4 first:pl-0">
              <dt className="font-accent text-[13px] text-cream/65">{label}</dt>
              <dd className="mt-1.5 text-sm font-medium md:text-base">{value}</dd>
            </div>
          ))}
        </motion.dl>

        <motion.div {...rise(0.6)} className="mt-8">
          <p className="font-accent text-[13px] text-cream/65">Built with</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <li key={t} className="chip">{t}</li>
            ))}
          </ul>
          {project.link && (
            <a href={project.link} target="_blank" rel="noreferrer" className="roll-plain btn-gloss mt-8 inline-block rounded-full px-6 py-3 font-accent text-xs">
              <RollText>Visit live site ↗</RollText>
            </a>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.35, ease: EASE }}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width - 0.5);
          py.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => {
          px.set(0);
          py.set(0);
        }}
        className="relative grid h-[58svh] min-h-80 place-items-center overflow-hidden rounded-[2rem] border border-cream/10 bg-[#04170e] perspective-[1400px] lg:h-[68svh]"
      >
        <div aria-hidden className="tech-grid absolute inset-0 rounded-[2rem] opacity-60" />
        {/* A soft light that follows the cursor behind the device */}
        <motion.div
          aria-hidden
          style={{ left: glowX, top: glowY }}
          className="absolute h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(224_202_60/0.2),rgb(19_111_99/0.14)_55%,transparent)] blur-2xl"
        />

        {!main ? (
          <p className="relative rounded-full border border-cream/15 bg-ink/40 px-4 py-2 font-accent text-[13px] text-cream/70 backdrop-blur">Screenshots coming soon</p>
        ) : site && phone ? (
          <motion.div style={{ rotateX, rotateY }} className="relative w-[88%] transform-3d">
            <div className="w-[82%]">
              <Browser shot={site} />
            </div>
            <div className="absolute -bottom-[6%] right-0 h-[118%] [transform:translateZ(60px)]">
              <Phone shot={phone} className="h-full" />
            </div>
          </motion.div>
        ) : mobile ? (
          <motion.div style={{ rotateX, rotateY }} className="relative h-[84%] transform-3d">
            {second && (
              <div className="absolute left-[58%] top-[8%] h-[88%] opacity-80 [transform:translateZ(-80px)_rotate(6deg)]">
                <Phone shot={second} className="h-full" />
              </div>
            )}
            <Phone shot={main} className="relative h-full" />
          </motion.div>
        ) : (
          <motion.div style={{ rotateX, rotateY }} className="relative w-[84%] transform-3d">
            <Browser shot={main} />
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
