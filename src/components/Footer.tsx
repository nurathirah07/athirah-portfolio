"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Magnetic from "@/components/Magnetic";
import Reveal from "@/components/Reveal";
import RiseText from "@/components/RiseText";
import RollText from "@/components/RollText";
import TransitionLink from "@/components/TransitionLink";
import { site } from "@/data/site";
import { scrollToY } from "@/lib/scroll";

const pages = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/work", label: "Work" },
  { href: "/contact", label: "Contact" },
];

// Closing section on every page: a glass card with a call to action, a
// one-click way to copy the email address, and the site's links.
export default function Footer() {
  const path = usePathname();
  const [copied, setCopied] = useState(false);

  // The contact page is the call to action; the admin doesn't need one.
  const showCard = path !== "/contact" && !path.startsWith("/admin");
  const socials = [
    { label: "GitHub", href: site.links.github },
    { label: "LinkedIn", href: site.links.linkedin },
  ].filter((s) => s.href);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: fall back to opening the email app.
      window.location.href = `mailto:${site.email}`;
    }
  };

  return (
    <footer className="relative z-10 px-6 pb-24 md:px-12 md:pb-8">
      {showCard && (
        <Reveal>
          <div className="glass relative grid gap-12 overflow-hidden rounded-[2rem] p-8 md:p-14 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgb(224_202_60/0.18),transparent)] blur-2xl" />

            <div className="relative">
              <p className="flex items-center gap-2.5 font-accent text-[11px] text-cream/60">
                Contact
              </p>
              <h2 className="mt-6 max-w-xl font-display text-4xl leading-[1.05] md:text-6xl">
                <RiseText text="Get in touch" accent="touch" />
              </h2>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Magnetic>
                  <TransitionLink href="/contact" className="roll-plain btn-gloss inline-block rounded-full px-8 py-4 font-accent text-sm">
                    <RollText>Send a message</RollText>
                  </TransitionLink>
                </Magnetic>
                <button
                  type="button"
                  onClick={copyEmail}
                  data-cursor-label={copied ? "Copied" : "Copy"}
                  className="rounded-full border border-cream/20 px-6 py-4 text-sm transition-colors duration-300 hover:border-gold hover:text-gold"
                >
                  <span aria-live="polite">{copied ? "Copied ✓" : site.email}</span>
                  {!copied && <span className="ml-3 font-accent text-[10px] text-cream/45">Copy</span>}
                </button>
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-8 text-sm lg:pt-2">
              <nav aria-label="Footer">
                <p className="font-accent text-[10px] text-cream/45">Pages</p>
                <ul className="mt-3">
                  {pages.map((p) => (
                    <li key={p.href}>
                      <TransitionLink href={p.href} className="inline-block py-1.5 text-cream/80 hover:text-gold"><RollText>{p.label}</RollText></TransitionLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <div>
                <p className="font-accent text-[10px] text-cream/45">Elsewhere</p>
                <ul className="mt-3">
                  {socials.map((s) => (
                    <li key={s.label}>
                      <a href={s.href} target="_blank" rel="noreferrer" className="inline-block py-1.5 text-cream/80 hover:text-gold"><RollText>{`${s.label} ↗`}</RollText></a>
                    </li>
                  ))}
                  <li>
                    <a href={`mailto:${site.email}`} className="inline-block py-1.5 text-cream/80 hover:text-gold"><RollText>Email ↗</RollText></a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 font-accent text-[11px] text-cream/50">
        <span>© 2026 {site.name} · {site.location}</span>
        <button type="button" onClick={() => scrollToY(0, 1)} className="py-3 font-accent hover:text-gold">
          <RollText>Back to top ↑</RollText>
        </button>
      </div>
    </footer>
  );
}
