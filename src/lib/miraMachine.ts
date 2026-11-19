// The phases of a conversation with Mira, as a state machine (see ./machine).
//
//   welcome ──START──▶ asking ◀──SAY (her reply to the answer)
//                       ├──DRAFTED──▶ drafted ──RESTART──▶ asking
//                       └──SEND──▶ sending ──DELIVERED──▶ sent ──RESTART──▶ asking
//                                     │  ▲
//                                  FAILED │ SEND (try again)
//                                     ▼  │
//                                    failed
//
// - welcome:  the start screen; Mira hasn't appeared.
// - asking:   Mira has said `turn` and waits for the visitor.
// - sending:  the finished brief is on its way to the inbox.
// - sent / drafted / failed: how sending ended. "drafted" means it was handed
//   to the visitor's email app instead.
//
// Which question Mira asks (greeting, service, budget…) is a separate, smaller
// machine inside each turn: see `steps`, `nextStep` and `previousStep` in
// src/data/assistant.ts.
//
// SAY carries `after`, the id of the turn it answers. A stale one (a double
// click on a question since replaced) no longer matches and is ignored, so each
// question is answered exactly once.
import type { Transitions } from "./machine";
import type { Turn } from "./miraBrain";

type Talking = { turn: Turn; id: number };
export type Phase =
  | { name: "welcome" }
  | ({ name: "asking" } & Talking)
  | ({ name: "sending" } & Talking)
  | ({ name: "sent" } & Talking)
  | ({ name: "drafted" } & Talking)
  | ({ name: "failed" } & Talking);

export type PhaseEvent =
  | { type: "START"; turn: Turn } // Start pressed on the welcome screen
  | { type: "SAY"; turn: Turn; after: number } // Mira's reply to turn `after`
  | { type: "SEND" } // send the brief to the inbox
  | { type: "DRAFTED" } // handed to the visitor's email app instead
  | { type: "DELIVERED" }
  | { type: "FAILED" }
  | { type: "RESTART"; turn: Turn }; // start another project

const atSummary = (phase: Talking) => phase.turn.step === "summary";

export const conversation: Transitions<Phase, PhaseEvent> = {
  welcome: {
    START: (_, { turn }) => ({ name: "asking", turn, id: 1 }),
  },
  asking: {
    SAY: (phase, { turn, after }) => (after === phase.id ? { name: "asking", turn, id: phase.id + 1 } : null),
    SEND: (phase) => (atSummary(phase) ? { ...phase, name: "sending" } : null),
    DRAFTED: (phase) => (atSummary(phase) ? { ...phase, name: "drafted" } : null),
  },
  sending: {
    DELIVERED: (phase) => ({ ...phase, name: "sent" }),
    FAILED: (phase) => ({ ...phase, name: "failed" }),
  },
  failed: {
    SEND: (phase) => ({ ...phase, name: "sending" }),
  },
  sent: {
    RESTART: (phase, { turn }) => ({ name: "asking", turn, id: phase.id + 1 }),
  },
  drafted: {
    RESTART: (phase, { turn }) => ({ name: "asking", turn, id: phase.id + 1 }),
  },
};
