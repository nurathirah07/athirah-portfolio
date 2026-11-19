import type { Transitions } from "./machine";

// What the visitor is doing with a project's screens strip (ShotRail), shown on
// the strip as data-mode:
//
//   drifting ──POINT / TAP──▶ focused ──LET_GO──▶ drifting
//      │  ▲                     │  ▲
//      │  └──────DROP───────┐   │  └ POINT / TAP (another screen)
//      └──GRAB──▶ dragging ◀┴───┘ GRAB
//
// - drifting: nobody is touching it, so it drifts sideways on its own.
// - focused:  one screen is brought forward (pointed at, or tapped); the
//             others dim. `index` is which copy of it in the looping strip.
// - dragging: being dragged or swiped. Pointing at screens while dragging
//             doesn't focus them, and letting go of a focus can't happen.
// RESET (any state) puts it back to drifting when its page is hidden.
export type RailMode = { name: "drifting" } | { name: "focused"; index: number } | { name: "dragging" };
export type RailEvent =
  | { type: "POINT"; index: number } // a mouse moved onto a screen
  | { type: "TAP"; index: number } // a finger tapped a screen (focus it, sliding it to the middle)
  | { type: "LET_GO" } // pointer left, a tap beside the screens, an arrow button, or a sideways scroll
  | { type: "GRAB" } // a press moved far enough to count as a drag
  | { type: "DROP" } // the drag ended
  | { type: "RESET" };

const focus = (_: RailMode, { index }: { index: number }): RailMode => ({ name: "focused", index });
const drifting = (): RailMode => ({ name: "drifting" });
const dragging = (): RailMode => ({ name: "dragging" });

export const railModes: Transitions<RailMode, RailEvent> = {
  drifting: { POINT: focus, TAP: focus, GRAB: dragging, RESET: drifting },
  focused: { POINT: focus, TAP: focus, LET_GO: drifting, GRAB: dragging, RESET: drifting },
  dragging: { DROP: drifting, RESET: drifting },
};
