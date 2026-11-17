"use client";
import { useState, useSyncExternalStore } from "react";
import { createMachine, type Event, type Machine, type State, type Transitions } from "./machine";

/**
 * A state machine that lives as long as the component does. Returns the
 * current state (the component re-renders when it changes) and the machine,
 * whose `send` can be called from event handlers and effects.
 */
export function useMachine<S extends State, E extends Event>(initial: S, transitions: Transitions<S, E>): [S, Machine<S, E>] {
  const [machine] = useState(() => createMachine(initial, transitions));
  const state = useSyncExternalStore(machine.subscribe, machine.get, () => initial);
  return [state, machine];
}
