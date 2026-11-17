// Checks and tidies what the live AI writes for Mira, before anyone sees or
// hears it. Kept separate from the AI route so it can be tested on its own
// (src/lib/miraSpeech.test.ts).
import { lines, projectTypes, type Brief, type Step } from "@/data/assistant";

// Spelled-out forms the AI sometimes uses, and how people actually say them.
// Only changed when another word follows: "Here it is." must stay as it is.
const CONTRACTIONS: [RegExp, string][] = [
  [/\blet us\b(?= \w)/gi, "let's"],
  [/\bI am\b(?= \w)/g, "I'm"],
  [/\bI will\b(?= \w)/g, "I'll"],
  [/\bI would\b(?= \w)/g, "I'd"],
  [/\bI have\b(?= (?:got|been|seen|heard|noted)\b)/g, "I've"],
  [/\byou are\b(?= \w)/gi, "you're"],
  [/\byou will\b(?= \w)/gi, "you'll"],
  [/\bwe are\b(?= \w)/gi, "we're"],
  [/\bwe will\b(?= \w)/gi, "we'll"],
  [/\b(that|it|what|there|here|who|she) is\b(?= \w)/gi, "$1's"],
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bcannot\b/gi, "can't"],
  [/\bwill not\b/gi, "won't"],
  [/\bis not\b/gi, "isn't"],
  [/\bare not\b/gi, "aren't"],
];

/** Plain, natural speech: no links, symbols or emojis, and contractions where people would use them. */
export function speakable(raw: string): string {
  let out = raw
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>|~[\]{}]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
  for (const [pattern, short] of CONTRACTIONS) {
    out = out.replace(pattern, (match, ...groups) => {
      const word = typeof groups[0] === "string" ? short.replace("$1", groups[0]) : short;
      // Keep a capital letter at the start of a sentence.
      return /^[A-Z]/.test(match) ? word[0].toUpperCase() + word.slice(1) : word;
    });
  }
  return out;
}

const plain = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * The option a free answer means, or null when it doesn't clearly match one.
 * Exact match first, then an option named inside the answer ("an online store
 * for my bakery" -> "Online store"), then the answer inside an option.
 */
export function matchOption(value: string, options: string[]): string | null {
  const v = plain(value);
  if (!v) return null;
  const exact = options.find((o) => plain(o) === v);
  if (exact) return exact;
  // The longest option named in the answer, so "Web app / system" beats "Website" where both fit.
  const named = options.filter((o) => plain(o).length > 2 && ` ${v} `.includes(` ${plain(o)} `)).sort((a, b) => b.length - a.length)[0];
  if (named) return named;
  const inside = options.filter((o) => v.length > 3 && ` ${plain(o)} `.includes(` ${v} `));
  return inside.length === 1 ? inside[0] : null;
}

/** The written question for a step: what the page expects her to ask next. */
export function questionFor(step: Step, brief: Brief, seenWork = false): string {
  switch (step) {
    case "service": return lines.ask.service;
    case "project_type": return lines.askType[brief.service ?? ""] ?? lines.ask.service;
    case "stage": return lines.ask.stage;
    case "timeline": return lines.ask.timeline;
    case "budget": return lines.ask.budget;
    case "details": return seenWork ? lines.ask.detailsSeenWork : lines.ask.details;
    case "contact": return lines.ask.contact;
    case "summary": return lines.ask.summary;
    default: return lines.ask.greeting;
  }
}

/** The first sentence of a reply (her reaction), without the question that follows it. */
export function reactionOf(reply: string): string {
  const first = reply.match(/^.*?[.!](?=\s|$)/)?.[0]?.trim();
  return first && !first.includes("?") ? first : "";
}

/** True when the project types for a service include this option. */
export const isTypeFor = (service: string | null, option: string) => !!service && (projectTypes[service] ?? []).includes(option);

// Phrases that clearly answer a question, for when the AI misses them.
// Deliberately few and unambiguous: anything unclear is left for her to ask.
const CLEAR_ANSWERS: { field: "timeline" | "stage"; option: string; words: RegExp }[] = [
  { field: "timeline", option: "Flexible", words: /\b(no rush|no hurry|whenever|flexible|not urgent|take your time)\b/i },
  { field: "timeline", option: "ASAP", words: /\b(asap|as soon as possible|urgent(ly)?|right away)\b/i },
  { field: "timeline", option: "Within 1 month", words: /\b(next month|within a month|in a month|few weeks|couple of weeks)\b/i },
  { field: "timeline", option: "1 to 3 months", words: /\b(2|3|two|three) months\b/i },
  { field: "stage", option: "Just an idea", words: /\b(just an idea|only an idea|still an idea|from scratch)\b/i },
  { field: "stage", option: "Have a design", words: /\b(have|got|already have) (a |the )?(design|mockup|figma)\b/i },
  { field: "stage", option: "Have an existing site", words: /\b(existing|current|old) (site|website|app|system)\b/i },
];

/** Answers a typed message clearly gives, by its words alone. */
export function clearAnswers(message: string): Partial<Record<"timeline" | "stage", string>> {
  const found: Partial<Record<"timeline" | "stage", string>> = {};
  for (const { field, option, words } of CLEAR_ANSWERS) if (!found[field] && words.test(message)) found[field] = option;
  return found;
}

/** Whether a typed message asks to change an earlier answer. */
export const wantsChange = (message: string) => /\b(change|changed|actually|instead|switch|wrong|edit|go back|redo|update|not .{0,20} anymore|rather)\b/i.test(message);
