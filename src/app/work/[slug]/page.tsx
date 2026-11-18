import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProjectIntro from "@/components/ProjectIntro";
import Reveal from "@/components/Reveal";
import RiseText from "@/components/RiseText";
import RollText from "@/components/RollText";
import ShotRail from "@/components/ShotRail";
import TransitionLink from "@/components/TransitionLink";
import { projects, site, type Project } from "@/data/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  return { title: `${project?.title ?? "Project"} — ${site.name}`, description: project?.summary };
}

export default function ProjectPage({ params }: Props) {
  return <Suspense>{params.then(({ slug }) => <Detail slug={slug} />)}</Suspense>;
}

// A neighbouring project: thumbnail, title and an arrow that slides on hover.
function Neighbour({ project, label, arrow }: { project: Project; label: string; arrow: "←" | "→" }) {
  const thumb = project.shots[0];
  return (
    <TransitionLink
      href={`/work/${project.slug}`}
      className={`glass glass-hover group flex items-center gap-5 rounded-3xl p-4 md:p-5 ${arrow === "→" ? "flex-row-reverse text-right" : ""}`}
    >
      <span className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border border-cream/10 bg-spruce/20 md:h-24 md:w-32">
        {thumb && (
          <Image src={thumb.src} alt="" fill sizes="128px" className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-accent text-[13px] text-cream/65">{label}</span>
        <span className="mt-1.5 block truncate font-display text-xl transition-colors duration-300 group-hover:text-gold md:text-2xl">{project.title}</span>
        <span className="mt-1 block text-xs text-cream/70 md:text-cream/55">{project.kind}, {project.year}</span>
      </span>
      <span
        aria-hidden
        className={`order-first hidden px-2 text-xl text-cream/70 md:text-cream/50 transition-all duration-300 group-hover:text-gold sm:block ${arrow === "→" ? "group-hover:translate-x-1.5" : "group-hover:-translate-x-1.5"}`}
      >
        {arrow}
      </span>
    </TransitionLink>
  );
}

function Detail({ slug }: { slug: string }) {
  const index = projects.findIndex((p) => p.slug === slug);
  if (index < 0) notFound();
  const project = projects[index];
  const next = projects[(index + 1) % projects.length];
  const prev = projects[(index - 1 + projects.length) % projects.length];

  return (
    <>
      <ProjectIntro project={project} index={index} total={projects.length} />

      {project.shots.length > 1 && <ShotRail shots={project.shots} platform={project.platform} />}

      <section aria-label="More projects" className="mt-24 lg:mt-32">
        <Reveal className="flex items-end justify-between gap-6">
          <h2 className="font-display text-3xl md:text-5xl">
            <RiseText text="More projects" />
          </h2>
          <TransitionLink href="/work" className="font-accent text-xs text-gold"><RollText>See all projects</RollText></TransitionLink>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6">
          <Reveal><Neighbour project={prev} label="Previous project" arrow="←" /></Reveal>
          <Reveal delay={0.08}><Neighbour project={next} label="Next project" arrow="→" /></Reveal>
        </div>
      </section>
    </>
  );
}
