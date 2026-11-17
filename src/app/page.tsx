import ExpertiseList from "@/components/ExpertiseList";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Reveal from "@/components/Reveal";
import RiseText from "@/components/RiseText";
import ProjectCard from "@/components/ProjectCard";
import RollText from "@/components/RollText";
import ScrollWords from "@/components/ScrollWords";
import SectionHead from "@/components/SectionHead";
import TransitionLink from "@/components/TransitionLink";
import { site, projects } from "@/data/site";

const SECTION = "mt-28 lg:mt-40";

export default function Home() {
  // The newest chapter of the About page's journey is what she is doing now.
  const now = site.journey[site.journey.length - 1];
  const facts = [
    { label: "Now", value: `${now.role.split(",")[0]} at ${now.org}` },
    { label: "Based in", value: site.location },
    { label: "Builds", value: "Web, mobile and AI systems" },
  ];

  return (
    <>
      <Hero />

      <section className={SECTION}>
        <SectionHead index="01" label="Introduction" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-end lg:gap-20">
          <ScrollWords text={site.statement} className="text-3xl leading-tight md:text-5xl" />
          <Reveal>
            <dl className="glass rounded-3xl p-6">
              {facts.map((f) => (
                <div key={f.label} className="border-b border-cream/10 py-4 first:pt-0">
                  <dt className="font-accent text-[10px] text-cream/50">
                    {f.label}
                  </dt>
                  <dd className="mt-1.5 text-sm font-medium leading-snug">{f.value}</dd>
                </div>
              ))}
              <TransitionLink href="/about" className="mt-5 inline-block font-accent text-[11px] text-gold">
                <RollText>More about me →</RollText>
              </TransitionLink>
            </dl>
          </Reveal>
        </div>
      </section>

      <section className={SECTION}>
        <SectionHead index="02" label="Selected work" />
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl md:text-6xl"><RiseText text="Featured projects" accent="projects" /></h2>
          <TransitionLink href="/work" className="font-accent text-xs text-gold"><RollText>{`All ${projects.length} projects →`}</RollText></TransitionLink>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {projects.slice(0, 3).map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.1}><ProjectCard p={p} index={i} /></Reveal>
          ))}
        </div>
      </section>

      {/* A light, matte panel: a change of surface from the dark glass around it */}
      <section className={`matte rounded-[2rem] p-6 md:p-14 ${SECTION}`}>
        <SectionHead index="03" label="Expertise" tone="ink" />
        <div className="mt-10 grid gap-x-10 gap-y-10 lg:grid-cols-3">
          <Reveal>
            <h2 className="font-display text-4xl md:text-5xl"><RiseText text="What I build" /></h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/70 md:text-base">{site.expertiseIntro}</p>
          </Reveal>
          <ExpertiseList />
        </div>
      </section>

      <div className={`-mx-6 md:-mx-12 ${SECTION}`}>
        <Marquee items={site.skills} />
      </div>
    </>
  );
}
