import Journey from "@/components/Journey";
import Label from "@/components/Label";
import Reveal from "@/components/Reveal";
import RiseText from "@/components/RiseText";
import SkillsPanel from "@/components/SkillsPanel";
import { projects, site } from "@/data/site";

export const metadata = { title: `About — ${site.name}` };

export default function About() {
  // From the first year of the journey to the year of the newest project.
  // (Worked out from the data, not today's date, so the page can be built ahead of time.)
  const startYear = Number(site.journey[0].period.slice(0, 4));
  const latestYear = Math.max(...projects.map((p) => Number(p.year)));
  const facts = [
    { value: latestYear - startYear, label: "Years of study and work" },
    { value: projects.length, label: "Projects" },
    { value: site.services.length, label: "Service areas" },
  ];

  return (
    <>
      <Journey />

      <section className="mt-24 lg:mt-36">
        <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-8">
          <div>
            <Reveal><Label>Skills</Label></Reveal>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] md:text-6xl">
              <RiseText text="What I do" />
            </h2>
          </div>
          <Reveal delay={0.1}>
            <dl className="flex gap-8 md:gap-12">
              {facts.map((f) => (
                <div key={f.label} className="border-l border-cream/15 pl-4">
                  <dd className="font-display text-3xl leading-none md:text-4xl">{f.value}</dd>
                  <dt className="mt-2 max-w-24 text-xs leading-snug text-cream/55">{f.label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal className="mt-12 lg:mt-16">
          <SkillsPanel />
        </Reveal>
      </section>
    </>
  );
}
