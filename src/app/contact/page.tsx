import Assistant from "@/components/Assistant";
import ContactBackdrop from "@/components/ContactBackdrop";
import LocalTime from "@/components/LocalTime";
import Reveal from "@/components/Reveal";
import RollText from "@/components/RollText";
import { site } from "@/data/site";

export const metadata = { title: `Contact — ${site.name}` };

export default function Contact() {
  const details = [
    { label: "Email", value: site.email, href: `mailto:${site.email}` },
    { label: "Based in", value: site.location },
    { label: "Time zone", value: <LocalTime /> },
    { label: "GitHub", value: "View profile ↗", href: site.links.github },
    { label: "LinkedIn", value: "View profile ↗", href: site.links.linkedin },
    { label: "Resume", value: "Download PDF ↓", href: site.links.resume },
  ].filter((d) => d.href !== "");

  return (
    <>
      <h1 className="sr-only">Contact {site.name}</h1>

      <ContactBackdrop />

      <Assistant />

      {/* For anyone who'd rather just send an email */}
      <section aria-labelledby="direct-title" className="relative mt-16 grid gap-10 border-t border-cream/12 pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <Reveal>
          <h2 id="direct-title" className="font-display text-3xl leading-tight md:text-5xl">Prefer to email?</h2>
          <p className="mt-4 max-w-sm text-cream/65">Write to me directly, any time.</p>
        </Reveal>
        <Reveal delay={0.15}>
          <dl className="glass rounded-3xl px-5 py-1 md:px-7">
            {details.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-6 border-b border-cream/10 py-4 last:border-0">
                <dt className="font-accent text-[13px] text-cream/65">{d.label}</dt>
                <dd className="text-right text-sm font-medium md:text-base">
                  {d.href ? (
                    <a href={d.href} target={d.href.startsWith("http") ? "_blank" : undefined} download={d.href.endsWith(".pdf") ? "Nur Athirah Azmi - Resume.pdf" : undefined} rel="noreferrer" className="-my-3 inline-block py-3 hover:text-gold">
                      <RollText>{d.value}</RollText>
                    </a>
                  ) : (
                    d.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>
    </>
  );
}
