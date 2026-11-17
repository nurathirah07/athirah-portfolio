"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { animate, motion, useMotionTemplate, useMotionValue } from "motion/react";
import { CURTAIN_EVENT, type CurtainRequest } from "@/components/TransitionLink";
import type { Transitions } from "@/lib/machine";
import { useMachine } from "@/lib/useMachine";

const EASE = [0.76, 0, 0.24, 1] as const;
const DURATION = 0.6;
const RING = 0.09; // seconds the gold edge runs ahead of the dark disc
const GIVE_UP_MS = 10_000; // how long to keep the screen covered waiting for a page that isn't arriving

type Trip = CurtainRequest & { radius: number };

// The transition's phases (shown on the element as data-phase):
//
//   idle ──GO──▶ covering ──ARRIVED / GAVE_UP──▶ revealing ──UNCOVERED──▶ idle
//                   ▲  └─GO (another link: change destination)   │
//                   └──────────────────GO─────────────────────────┘
//
// - idle:      nothing showing.
// - covering:  the disc is growing over the page, then the route changes
//              behind it and we wait for the new page.
// - revealing: the disc is closing to uncover the page.
// GAVE_UP uncovers the screen if the new page never arrives (a failed load),
// so a visitor is never left looking at a dark screen.
type Phase = { name: "idle" } | { name: "covering"; trip: Trip } | { name: "revealing"; trip: Trip };
type PhaseEvent = { type: "GO"; trip: Trip } | { type: "ARRIVED" } | { type: "GAVE_UP" } | { type: "UNCOVERED" };
const cover = (_: Phase, { trip }: { trip: Trip }): Phase => ({ name: "covering", trip });
const reveal = ({ trip }: { trip: Trip }): Phase => ({ name: "revealing", trip });
const phases: Transitions<Phase, PhaseEvent> = {
  idle: { GO: cover },
  covering: { GO: cover, ARRIVED: reveal, GAVE_UP: reveal },
  revealing: { GO: cover, UNCOVERED: () => ({ name: "idle" }) },
};

// Page transition: a dark disc with a gold rim grows out of the spot that was
// clicked until it fills the screen, the route changes behind it, then the disc
// closes back to the same spot to uncover the new page.
export default function Curtain() {
  const router = useRouter();
  const path = usePathname();
  const [phase, curtain] = useMachine<Phase, PhaseEvent>({ name: "idle" }, phases);
  const trip = phase.name === "idle" ? null : phase.trip;
  const disc = useMotionValue(0);
  const rim = useMotionValue(0);
  const at = trip ? `${trip.x}px ${trip.y}px` : "50% 50%";
  const discClip = useMotionTemplate`circle(${disc}px at ${at})`;
  const rimClip = useMotionTemplate`circle(${rim}px at ${at})`;

  // A link was clicked.
  useEffect(() => {
    const go = (e: Event) => {
      const { href, x, y } = (e as CustomEvent<CurtainRequest>).detail;
      if (href === window.location.pathname) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
      } else {
        // Far enough to reach the furthest corner from the click.
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 8;
        curtain.send({ type: "GO", trip: { href, x, y, radius } });
      }
    };
    window.addEventListener(CURTAIN_EVENT, go);
    return () => window.removeEventListener(CURTAIN_EVENT, go);
  }, [router, curtain]);

  // The new page is here.
  useEffect(() => {
    if (phase.name === "covering" && phase.trip.href === path) curtain.send({ type: "ARRIVED" });
  }, [phase, path, curtain]);

  // Run each phase's animation.
  useEffect(() => {
    if (phase.name === "covering") {
      const { trip } = phase;
      let giveUp: ReturnType<typeof setTimeout> | undefined;
      animate(rim, trip.radius, { duration: DURATION, ease: EASE });
      animate(disc, trip.radius, { duration: DURATION, delay: RING, ease: EASE }).then(() => {
        // Only move on once the screen is really covered, and if this is still
        // the trip in progress (an interrupted run resolves early).
        const now = curtain.get();
        if (disc.get() < trip.radius - 1 || now.name !== "covering" || now.trip !== trip) return;
        router.push(trip.href);
        giveUp = setTimeout(() => curtain.send({ type: "GAVE_UP" }), GIVE_UP_MS);
      });
      return () => clearTimeout(giveUp);
    }
    if (phase.name === "revealing") {
      animate(disc, 0, { duration: DURATION, delay: 0.1, ease: EASE });
      animate(rim, 0, { duration: DURATION, delay: 0.1 + RING, ease: EASE }).then(() => {
        if (rim.get() <= 1) curtain.send({ type: "UNCOVERED" });
      });
    }
  }, [phase, disc, rim, router, curtain]);

  return (
    <div aria-hidden data-phase={phase.name} className="pointer-events-none fixed inset-0 z-200" style={{ visibility: trip ? "visible" : "hidden" }}>
      <motion.div style={{ clipPath: rimClip }} className="absolute inset-0 bg-linear-to-br from-gold to-flame" />
      <motion.div
        style={{ clipPath: discClip }}
        className="absolute inset-0 bg-[#020a06] bg-[radial-gradient(60rem_40rem_at_70%_20%,rgb(19_111_99/0.35),transparent_70%)]"
      />
    </div>
  );
}
