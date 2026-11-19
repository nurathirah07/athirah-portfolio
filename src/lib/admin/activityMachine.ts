import type { Transitions } from "../machine";

// What the admin editor is doing (shown on the editor as data-phase and data-task):
//
//   idle ──START (saving | moving | deleting)──▶ busy ──FINISH──▶ idle (with a notice)
//
// Saving, reordering and deleting all rewrite projects.json, so only one runs
// at a time: START is refused while busy, and every button is disabled. FINISH
// carries the notice to show (or none); CLEAR hides it when another project is
// chosen, so "Changes saved." never sits above a different project.
export type Task = "saving" | "moving" | "deleting";
export type Notice = { tone: "done" | "error"; text: string };
export type Activity = { name: "idle"; notice: Notice | null } | { name: "busy"; task: Task };
export type ActivityEvent = { type: "START"; task: Task } | { type: "FINISH"; notice: Notice | null } | { type: "CLEAR" };

export const activity: Transitions<Activity, ActivityEvent> = {
  idle: {
    START: (_, { task }) => ({ name: "busy", task }),
    CLEAR: (state) => (state.notice ? { name: "idle", notice: null } : null),
  },
  busy: {
    FINISH: (_, { notice }) => ({ name: "idle", notice }),
  },
};
