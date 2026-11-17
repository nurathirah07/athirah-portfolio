// A very small state machine helper.
//
// A machine is a table: for each state, the events it accepts and the state
// each one leads to. Anything not in the table is ignored, so impossible
// situations (answering one question twice, sending while already sending)
// cannot happen, instead of each caller having to guard against them.
//
//   const light = createMachine<Light, LightEvent>({ name: "off" }, {
//     off: { TOGGLE: () => ({ name: "on" }) },
//     on:  { TOGGLE: () => ({ name: "off" }) },
//   });
//   light.send({ type: "TOGGLE" }); // true: the event was accepted
//
// This file has no imports on purpose, so machines can be tested with plain
// `node --test` (see src/lib/*.test.ts). React components read a machine with
// useMachine from ./useMachine.

export type State = { name: string };
export type Event = { type: string };

/** For each state: the events it accepts. A handler returns the next state, or null to refuse the event. */
export type Transitions<S extends State, E extends Event> = {
  [N in S["name"]]: {
    [T in E["type"]]?: (state: Extract<S, { name: N }>, event: Extract<E, { type: T }>) => S | null;
  };
};

export type Machine<S extends State, E extends Event> = {
  /** The current state. */
  get(): S;
  /** Offer an event. Returns whether the current state accepted it. */
  send(event: E): boolean;
  /** Whether the current state has a transition for this kind of event. */
  can(type: E["type"]): boolean;
  /** Be told after every accepted event. Returns a function that stops it. */
  subscribe(listener: () => void): () => void;
};

export function createMachine<S extends State, E extends Event>(initial: S, transitions: Transitions<S, E>): Machine<S, E> {
  let state = initial;
  const listeners = new Set<() => void>();
  type Handler = (state: S, event: E) => S | null;
  const handlerFor = (type: string) => (transitions as Record<string, Record<string, Handler | undefined>>)[state.name]?.[type];

  return {
    get: () => state,
    can: (type) => !!handlerFor(type),
    send(event) {
      const next = handlerFor(event.type)?.(state, event);
      if (!next) return false;
      state = next;
      for (const listener of listeners) listener();
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
