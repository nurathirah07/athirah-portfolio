import type { Transitions } from "./machine";

// A copy-to-clipboard button's phases (shown on the button as data-copy):
//
//   idle ──COPY──▶ copying ──DONE──▶ copied ──RESET (after a moment)──▶ idle
//                     └─────FAIL───▶ failed ──RESET (after a moment)──▶ idle
//
// - copying: the browser is writing to the clipboard. A second click now is
//   ignored, so the label can't flicker.
// - copied / failed: the button says so for a moment, then goes back to idle.
//   Copying again from either starts over, so a quick second click never
//   resets early.
export type CopyPhase = { name: "idle" } | { name: "copying" } | { name: "copied" } | { name: "failed" };
export type CopyEvent = { type: "COPY" } | { type: "DONE" } | { type: "FAIL" } | { type: "RESET" };

const copying = (): CopyPhase => ({ name: "copying" });
const idle = (): CopyPhase => ({ name: "idle" });

export const copyPhases: Transitions<CopyPhase, CopyEvent> = {
  idle: { COPY: copying },
  copying: { DONE: () => ({ name: "copied" }), FAIL: () => ({ name: "failed" }) },
  copied: { COPY: copying, RESET: idle },
  failed: { COPY: copying, RESET: idle },
};

/** How long "copied" and "failed" stay on the button before it goes back to idle. */
export const COPY_SHOWN_MS = { copied: 2000, failed: 4000 } as const;
