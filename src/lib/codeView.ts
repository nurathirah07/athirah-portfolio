"use client";
import { useSyncExternalStore } from "react";
import { createMachine, type Transitions } from "./machine";

// The Code view's phases (shown as data-phase on its root):
//
//   off ──TOGGLE──▶ entering ──ENTERED──▶ on ──TOGGLE / ESC / NAVIGATE──▶ leaving ──LEFT──▶ off
//
// A press while it is still sweeping in or out is ignored.
export type CodeViewPhase = { name: "off" } | { name: "entering" } | { name: "on" } | { name: "leaving" };
export type CodeViewEvent = { type: "TOGGLE" } | { type: "ENTERED" } | { type: "LEFT" } | { type: "ESC" } | { type: "NAVIGATE" };
const leave = (): CodeViewPhase => ({ name: "leaving" });
const phases: Transitions<CodeViewPhase, CodeViewEvent> = {
  off: { TOGGLE: () => ({ name: "entering" }) },
  entering: { ENTERED: () => ({ name: "on" }) },
  on: { TOGGLE: leave, ESC: leave, NAVIGATE: leave },
  leaving: { LEFT: () => ({ name: "off" }) },
};

// One for the whole page: the dock's button and the view itself share it.
const OFF: CodeViewPhase = { name: "off" };
export const codeView = createMachine<CodeViewPhase, CodeViewEvent>(OFF, phases);

export function useCodeView(): CodeViewPhase {
  return useSyncExternalStore(codeView.subscribe, codeView.get, () => OFF);
}
