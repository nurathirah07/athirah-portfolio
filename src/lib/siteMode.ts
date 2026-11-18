"use client";
import { useSyncExternalStore } from "react";
import { createMachine, type Transitions } from "./machine";

// Which version of the site is showing, picked in the dock (shown as data-phase
// on Story mode's root):
//
//   site ──STORY──▶ entering ──ARRIVED──▶ story ──SITE / ESC / NAVIGATE──▶ leaving ──ARRIVED──▶ site
//
// - site:  the normal, dark site.
// - story: the light, editorial version (components/StoryMode.tsx).
// A press while it's still dissolving from one to the other is ignored.
export type ModePhase = { name: "site" } | { name: "entering" } | { name: "story" } | { name: "leaving" };
export type ModeEvent = { type: "STORY" } | { type: "SITE" } | { type: "ESC" } | { type: "NAVIGATE" } | { type: "ARRIVED" };
const leave = (): ModePhase => ({ name: "leaving" });
const phases: Transitions<ModePhase, ModeEvent> = {
  site: { STORY: () => ({ name: "entering" }) },
  entering: { ARRIVED: () => ({ name: "story" }) },
  story: { SITE: leave, ESC: leave, NAVIGATE: leave },
  leaving: { ARRIVED: () => ({ name: "site" }) },
};

const SITE: ModePhase = { name: "site" };
export const siteMode = createMachine<ModePhase, ModeEvent>(SITE, phases);

export function useSiteMode(): ModePhase {
  return useSyncExternalStore(siteMode.subscribe, siteMode.get, () => SITE);
}
