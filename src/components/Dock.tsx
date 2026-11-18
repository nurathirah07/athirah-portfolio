"use client";
import { motion } from "motion/react";
import Magnetic from "@/components/Magnetic";
import { codeView, useCodeView } from "@/lib/codeView";
import { siteMode, useSiteMode } from "@/lib/siteMode";

const SPRING = { type: "spring", stiffness: 400, damping: 32 } as const;

// A small glass pill at the bottom centre of wide screens:
// - </> opens the Code view, a live blueprint of how the page is built.
// - Site / Story switches between the normal dark site and Story mode, a light,
//   editorial version of it; the cream pill slides to the one that's showing.
// Each button's name shows above it on hover or keyboard focus.
export default function Dock() {
  const code = useCodeView();
  const mode = useSiteMode();
  const codeOn = code.name === "entering" || code.name === "on";
  const story = mode.name === "entering" || mode.name === "story";

  const tip = "pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/90 px-3 py-1.5 text-xs text-cream/85 opacity-0 transition-opacity duration-200";

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[145] hidden -translate-x-1/2 md:block">
      <Magnetic strength={0.15}>
        <div className="glass-dark flex items-center gap-1 rounded-full p-1">
          <span className="group/tip relative">
            <button
              type="button"
              data-dock="code"
              disabled={mode.name !== "site"}
              onClick={() => codeView.send({ type: "TOGGLE" })}
              aria-pressed={codeOn}
              aria-label={codeOn ? "Hide the code" : "Show the code"}
              className={`grid h-10 w-11 place-items-center rounded-full font-mono text-sm transition-colors duration-300 disabled:opacity-35 ${codeOn ? "bg-gold text-ink" : "text-cream/80 hover:text-gold"}`}
            >
              {"</>"}
            </button>
            <span aria-hidden className={`${tip} group-hover/tip:opacity-100 group-has-focus-visible/tip:opacity-100`}>
              {mode.name !== "site" ? "Only on the site view" : codeOn ? "Hide the code" : "Show the code"}
            </span>
          </span>

          <span aria-hidden className="mx-1 h-5 w-px bg-cream/15" />

          <div role="group" aria-label="View" className="flex">
            {(
              [
                ["site", "Site", "SITE"],
                ["story", "Story", "STORY"],
              ] as const
            ).map(([key, label, event]) => {
              const active = key === "story" ? story : !story;
              return (
                <button
                  key={key}
                  type="button"
                  data-dock={key}
                  aria-pressed={active}
                  onClick={() => siteMode.send({ type: event })}
                  className={`relative h-10 rounded-full px-5 text-sm font-semibold transition-colors duration-300 ${active ? "text-ink" : "text-cream/75 hover:text-cream"}`}
                >
                  {active && <motion.span layoutId="dock-pill" className="absolute inset-0 rounded-full bg-cream" transition={SPRING} />}
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Magnetic>
    </div>
  );
}
