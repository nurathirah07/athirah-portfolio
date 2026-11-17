// Mira's scripted brain: decides what she says next using only her written
// lines. It runs the whole conversation when no AI is set up, and steps in
// whenever the AI is slow or unavailable, so the form always works.
import {
  CHANGE,
  START,
  UNSURE,
  greetingOptions,
  inputFor,
  lines,
  nextStep,
  optionsFor,
  type Brief,
  type Input,
  type Mood,
  type Step,
} from "@/data/assistant";

/** One thing Mira says, and what the page should show with it. */
export type Turn = {
  /** Shown on screen. */
  reply: string;
  /** The lines that say it aloud, in order. Written lines have recordings; null means speak `reply` as one line. */
  recorded: string[] | null;
  /** Written live by the AI, so some of its lines have no recording (and that's expected). */
  aiWritten?: boolean;
  mood: Mood;
  step: Step;
  options: string[];
  input: Input;
  brief: Brief;
};

/** What the visitor just did. */
export type Said =
  | { kind: "start" }
  | { kind: "tap"; text: string } // picked an option
  | { kind: "text"; text: string } // typed a message
  | { kind: "form" } // filled in details or contact
  | { kind: "back" }; // went back to change an answer

export type Context = {
  seenWork: boolean; // has looked at the projects
  returning: boolean; // has talked to Mira on an earlier visit
  count: number; // how many turns so far, used to vary her wording
  backs: number; // how many times the visitor has gone back so far
};

const moodFor: Record<Step, Mood> = {
  greeting: "happy",
  service: "curious",
  project_type: "curious",
  stage: "curious",
  timeline: "calm",
  budget: "calm",
  details: "curious",
  contact: "happy",
  summary: "excited",
  done: "happy",
};

function question(step: Step, brief: Brief, ctx: Context): string {
  switch (step) {
    case "service": return lines.ask.service;
    case "project_type": return lines.askType[brief.service ?? ""] ?? lines.ask.service;
    case "stage": return lines.ask.stage;
    case "timeline": return lines.ask.timeline;
    case "budget": return lines.ask.budget;
    case "details": return ctx.seenWork ? lines.ask.detailsSeenWork : lines.ask.details;
    case "contact": return lines.ask.contact;
    case "summary": return lines.ask.summary;
    default: return lines.ask.greeting;
  }
}

// What she says when the visitor goes back to `step`: the remark written for
// that question and the general ones, turn and turn about.
function backRemark(step: Step, ctx: Context): string {
  const general = lines.back[Math.floor(ctx.backs / 2) % lines.back.length];
  return ctx.backs % 2 === 0 ? (lines.backTo[step] ?? general) : general;
}

// Her reaction to the answer just given at `step`.
function reaction(step: Step, brief: Brief, ctx: Context): string {
  switch (step) {
    case "service": return lines.reactService[brief.service ?? ""] ?? lines.reactType[0];
    case "project_type": return lines.reactType[ctx.count % lines.reactType.length];
    case "stage": return lines.reactStage[brief.stage ?? ""] ?? lines.reactTimeline;
    case "timeline": return lines.reactTimeline;
    case "budget": return brief.budget === UNSURE ? lines.reactBudgetUnsure : lines.reactBudget;
    case "details": return brief.details ? lines.reactDetails : lines.reactSkip;
    default: return lines.reactContact;
  }
}

const turn = (recorded: string[], step: Step, brief: Brief, mood = moodFor[step], options = optionsFor(step, brief)): Turn => ({
  reply: recorded.join(" "),
  recorded,
  mood,
  step,
  options,
  input: inputFor(step),
  brief,
});

/**
 * @param at    the step the visitor was on when they acted (for "back": the step they went back to)
 * @param brief the answers so far, already including the one just given
 */
export function scriptedTurn(at: Step, brief: Brief, said: Said, ctx: Context): Turn {
  if (said.kind === "start") return turn([ctx.returning ? lines.greetingBack : lines.greeting], "greeting", brief);

  if (said.kind === "back") {
    return turn([backRemark(at, ctx), question(at, brief, ctx)], at, brief, "happy");
  }

  // A typed message needs AI to be understood; without it, point back to the choices.
  if (said.kind === "text" && inputFor(at) === "options") {
    return turn([lines.pickOne], at, brief, "thinking", at === "greeting" ? greetingOptions : undefined);
  }

  if (at === "greeting") {
    if (said.kind === "tap" && said.text === "See services") return turn([lines.seeServices], "greeting", brief, "calm", [START, "Just browsing"]);
    if (said.kind === "tap" && said.text === "Just browsing") return turn([lines.browsing], "greeting", brief, "calm", [START, "See services"]);
    return turn([lines.letsStart, lines.ask.service], "service", brief, "excited");
  }

  if (at === "summary" && said.kind === "tap" && said.text === CHANGE) {
    return turn([lines.ask.change], "summary", brief, "curious");
  }

  const next = nextStep(brief);
  return turn([reaction(at, brief, ctx), question(next, brief, ctx)], next, brief);
}
