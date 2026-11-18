"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react";
import Magnetic from "@/components/Magnetic";
import RollText from "@/components/RollText";
import TransitionLink from "@/components/TransitionLink";
import { site } from "@/data/site";
import type { Transitions } from "@/lib/machine";
import { lockScroll } from "@/lib/scroll";
import { useMachine } from "@/lib/useMachine";

const PAGE_EASE = [0.76, 0, 0.24, 1] as const;
const EASE = [0.22, 1, 0.36, 1] as const;

const pages = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/work", label: "Work" },
  { href: "/contact", label: "Contact" },
];

// The menu's phases (shown on the panel as data-phase):
//
//   closed ──TOGGLE──▶ opening ──OPENED──▶ open ──TOGGLE / NAVIGATE──▶ closing ──CLOSED──▶ closed
//
// A tap while it is still opening or closing is ignored, so it can't get stuck
// half open.
type Phase = { name: "closed" } | { name: "opening" } | { name: "open" } | { name: "closing" };
type MenuEvent = { type: "TOGGLE" } | { type: "OPENED" } | { type: "CLOSED" } | { type: "NAVIGATE" };
const phases: Transitions<Phase, MenuEvent> = {
  closed: { TOGGLE: () => ({ name: "opening" }) },
  opening: { OPENED: () => ({ name: "open" }) },
  open: { TOGGLE: () => ({ name: "closing" }), NAVIGATE: () => ({ name: "closing" }) },
  closing: { CLOSED: () => ({ name: "closed" }) },
};

// Phones and tablets: a menu button in the top-right corner. Tapping it opens a
// full-screen dark panel as a circle growing out of the button, with the pages
// rising in at a large size. Tapping a page closes it and goes there.
export default function Menu() {
  const path = usePathname();
  const reduce = useReducedMotion();
  const [phase, menu] = useMachine<Phase, MenuEvent>({ name: "closed" }, phases);
  const shown = phase.name !== "closed";
  const expanded = phase.name === "opening" || phase.name === "open";
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const radius = useMotionValue(0);
  const fade = useMotionValue(0);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const clip = useMotionTemplate`circle(${radius}px at ${origin.x}px ${origin.y}px)`;
  const [hovered, setHovered] = useState<number | null>(null);

  const toggle = () => {
    if (phase.name === "closed" && button.current) {
      const b = button.current.getBoundingClientRect();
      setOrigin({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
    }
    menu.send({ type: "TOGGLE" });
  };

  // Run each phase's animation.
  useEffect(() => {
    if (phase.name === "opening") {
      lockScroll(true);
      // Far enough to reach the furthest corner from the button.
      const far = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y)) + 8;
      const run = reduce ? animate(fade, 1, { duration: 0.3 }) : animate(radius, far, { duration: 0.7, ease: PAGE_EASE });
      if (!reduce) fade.set(1);
      run.then(() => menu.send({ type: "OPENED" }));
      return () => run.stop();
    }
    if (phase.name === "closing") {
      const run = reduce ? animate(fade, 0, { duration: 0.25 }) : animate(radius, 0, { duration: 0.5, ease: PAGE_EASE });
      run.then(() => {
        if (!reduce) fade.set(0);
        lockScroll(false);
        menu.send({ type: "CLOSED" });
        button.current?.focus();
      });
      return () => run.stop();
    }
  }, [phase.name, origin, reduce, radius, fade, menu]);

  // A page change (from a menu link or anywhere else) closes it.
  useEffect(() => {
    menu.send({ type: "NAVIGATE" });
  }, [path, menu]);

  // Never leave the page locked if the menu goes away mid-way.
  useEffect(() => () => lockScroll(false), []);

  // While it is showing: Esc closes it, and Tab stays inside it.
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return void menu.send({ type: "TOGGLE" });
      if (e.key !== "Tab" || !wrap.current) return;
      const items = [...wrap.current.querySelectorAll<HTMLElement>("a[href], button")].filter((el) => el.offsetParent);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, menu]);

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const line = "absolute left-1/2 h-[1.5px] w-5 -translate-x-1/2 rounded-full bg-cream transition-[top,rotate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

  return (
    <div ref={wrap} className="md:hidden">
      <div className="fixed right-3 top-2.5 z-[160]">
        <Magnetic>
          <button
            ref={button}
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls="site-menu"
            aria-label={expanded ? "Close menu" : "Open menu"}
            className="glass-dark relative block h-11 w-11 rounded-full"
          >
            <span aria-hidden className={`${line} ${expanded ? "top-1/2 -translate-y-1/2 rotate-45" : "top-[calc(50%-3.75px)]"}`} />
            <span aria-hidden className={`${line} ${expanded ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-[calc(50%+2.25px)]"}`} />
          </button>
        </Magnetic>
      </div>

      <motion.div
        id="site-menu"
        data-phase={phase.name}
        inert={!shown}
        aria-hidden={!shown}
        style={{ clipPath: reduce ? undefined : clip, opacity: fade, visibility: shown ? "visible" : "hidden" }}
        className="fixed inset-0 z-[150] flex flex-col overflow-hidden bg-[#020a06] bg-[radial-gradient(60rem_40rem_at_70%_20%,rgb(19_111_99/0.35),transparent_70%)] px-6 pb-8 pt-28"
      >
        <div aria-hidden className="grain pointer-events-none absolute inset-0" />

        <nav aria-label="Menu" className="relative">
          <ul onPointerLeave={() => setHovered(null)}>
            {pages.map((p, i) => {
              const current = isActive(p.href);
              return (
                <li key={p.href} className="overflow-hidden py-1">
                  <motion.div
                    initial={false}
                    animate={{ y: expanded || reduce ? "0%" : "110%" }}
                    transition={{ duration: expanded ? 0.8 : 0.3, delay: expanded ? 0.25 + i * 0.07 : 0, ease: EASE }}
                  >
                    <TransitionLink
                      href={p.href}
                      aria-current={current ? "page" : undefined}
                      onClick={() => menu.send({ type: "NAVIGATE" })}
                      onPointerEnter={() => setHovered(i)}
                      onFocus={() => setHovered(i)}
                      onBlur={() => setHovered(null)}
                      className={`roll-plain block font-display text-5xl leading-tight transition-opacity duration-300 ${current ? "text-gold" : "text-cream"} ${hovered !== null && hovered !== i ? "opacity-35" : "opacity-100"}`}
                    >
                      {p.label}
                    </TransitionLink>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        </nav>

        <motion.div
          initial={false}
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.5, delay: expanded ? 0.6 : 0 }}
          className="relative mt-auto flex flex-wrap items-end justify-between gap-4 text-sm text-cream/70"
        >
          <span>© 2026 {site.name}</span>
          <div className="flex flex-col items-end gap-2">
            <a href={`mailto:${site.email}`} className="text-cream hover:text-gold">
              <RollText>{site.email}</RollText>
            </a>
            <div className="flex gap-5">
              {site.links.github && (
                <a href={site.links.github} target="_blank" rel="noreferrer" className="py-1 hover:text-gold">
                  <RollText>GitHub</RollText>
                </a>
              )}
              {site.links.linkedin && (
                <a href={site.links.linkedin} target="_blank" rel="noreferrer" className="py-1 hover:text-gold">
                  <RollText>LinkedIn</RollText>
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
