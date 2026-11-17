"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import TransitionLink from "@/components/TransitionLink";
import RollText from "@/components/RollText";
import { site } from "@/data/site";

// Contact is reached through the "Let's talk" button, so it isn't repeated here.
const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/work", label: "Work" },
];

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring", stiffness: 400, damping: 32 } as const;

// Site navigation.
// - Wide screens: the name on the left, a floating glass pill of links in the
//   middle (a gold pill slides to the current page) and a "Let's talk" button.
// - Phones: the same links as a tab bar within thumb reach at the bottom.
// A thin line across the very top shows how far down the page you are.
export default function Nav() {
  const path = usePathname();
  const { scrollY, scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <motion.div aria-hidden style={{ scaleX: scrollYProgress }} className="fixed inset-x-0 top-0 z-[70] h-0.5 origin-left bg-linear-to-r from-gold to-flame" />

      <motion.header
        initial={{ y: "-100%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.6, ease: EASE }}
        className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between px-6 py-4 md:px-12"
      >
        {/* Keeps the name readable once content scrolls beneath it */}
        <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-linear-to-b from-ink/90 via-ink/50 to-transparent transition-opacity duration-500 ${scrolled ? "opacity-100" : "opacity-0"}`} />

        <TransitionLink href="/" className="font-display text-base md:text-xl">
          {site.name}
        </TransitionLink>

        <nav aria-label="Main" className="glass-dark absolute left-1/2 hidden -translate-x-1/2 rounded-full p-1 md:flex">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <TransitionLink
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-5 py-2.5 font-accent text-[11px] transition-colors duration-300 ${active ? "text-ink" : "text-cream/70 hover:text-cream"}`}
              >
                {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-gold" transition={SPRING} />}
                <span className="relative">{l.label}</span>
              </TransitionLink>
            );
          })}
        </nav>

        <TransitionLink
          href="/contact"
          aria-current={path === "/contact" ? "page" : undefined}
          className="roll-plain btn-gloss rounded-full px-5 py-2.5 font-accent text-[11px]"
        >
          <RollText>Let&apos;s talk</RollText>
        </TransitionLink>
      </motion.header>

      <nav
        aria-label="Mobile"
        className="glass-dark fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] grid grid-cols-3 rounded-full p-1 md:hidden"
      >
        {links.map((l) => {
          const active = isActive(l.href);
          return (
            <TransitionLink
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`relative rounded-full py-3 text-center font-accent text-[10px] transition-colors duration-300 ${active ? "text-ink" : "text-cream/70"}`}
            >
              {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-gold" transition={SPRING} />}
              <span className="relative">{l.label}</span>
            </TransitionLink>
          );
        })}
      </nav>
    </>
  );
}
