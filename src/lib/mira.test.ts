// Tests for Mira's logic: the conversation's phases, the order of her
// questions, and her written replies. Run with `npm test` (no browser needed).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CHANGE,
  CONFIRM,
  START,
  UNSURE,
  budgetsFor,
  emptyBrief,
  lines,
  nextStep,
  optionsFor,
  previousStep,
  projectTypes,
  recordedLines,
  services,
  steps,
  withAnswer,
  withoutAnswer,
  type Brief,
  type Step,
} from "@/data/assistant";
import { createMachine } from "./machine";
import { scriptedTurn, type Context, type Turn } from "./miraBrain";
import { conversation, type Phase, type PhaseEvent } from "./miraMachine";

const ctx: Context = { seenWork: false, returning: false, count: 0, backs: 0 };
const full: Brief = { service: "Website", project_type: "Portfolio", stage: "Just an idea", timeline: "ASAP", budget: UNSURE, details: "", name: "Jane", contact: "jane@example.com" };
const greeting = scriptedTurn("greeting", emptyBrief, { kind: "start" }, ctx);
const summary = scriptedTurn("contact", full, { kind: "form" }, ctx);
const newConversation = () => createMachine<Phase, PhaseEvent>({ name: "welcome" }, conversation);
const turnAt = (step: Step, brief: Brief): Turn => ({ ...greeting, step, brief });

// ---------- The machine helper ----------
test("a machine ignores events its current state has no transition for", () => {
  type Light = { name: "off" } | { name: "on" };
  type Flip = { type: "ON" } | { type: "OFF" };
  const light = createMachine<Light, Flip>({ name: "off" }, { off: { ON: () => ({ name: "on" }) }, on: { OFF: () => ({ name: "off" }) } });
  let changes = 0;
  light.subscribe(() => changes++);
  assert.equal(light.send({ type: "OFF" }), false);
  assert.equal(light.get().name, "off");
  assert.equal(light.can("ON"), true);
  assert.equal(light.send({ type: "ON" }), true);
  assert.equal(light.get().name, "on");
  assert.equal(changes, 1);
});

// ---------- The conversation's phases ----------
test("nothing happens before Start is pressed", () => {
  const mira = newConversation();
  assert.equal(mira.send({ type: "SAY", turn: greeting, after: 0 }), false);
  assert.equal(mira.send({ type: "SEND" }), false);
  assert.equal(mira.get().name, "welcome");
  assert.equal(mira.send({ type: "START", turn: greeting }), true);
  assert.deepEqual(mira.get(), { name: "asking", turn: greeting, id: 1 });
});

test("a question is answered exactly once (double clicks and stale replies are ignored)", () => {
  const mira = newConversation();
  mira.send({ type: "START", turn: greeting });
  assert.equal(mira.send({ type: "SAY", turn: greeting, after: 1 }), true);
  assert.equal(mira.send({ type: "SAY", turn: greeting, after: 1 }), false, "second answer to turn 1");
  assert.equal(mira.send({ type: "THINK", after: 1 }), false, "stale thinking");
  const now = mira.get();
  assert.equal(now.name === "asking" && now.id, 2);
});

test("while the AI is thinking, only its reply to that turn moves things on", () => {
  const mira = newConversation();
  mira.send({ type: "START", turn: greeting });
  assert.equal(mira.send({ type: "THINK", after: 1 }), true);
  assert.equal(mira.get().name, "thinking");
  assert.equal(mira.send({ type: "THINK", after: 1 }), false);
  assert.equal(mira.send({ type: "SEND" }), false);
  assert.equal(mira.send({ type: "SAY", turn: greeting, after: 7 }), false);
  assert.equal(mira.send({ type: "SAY", turn: greeting, after: 1 }), true);
  assert.equal(mira.get().name, "asking");
});

test("the brief can only be sent from the summary, and only once", () => {
  const mira = newConversation();
  mira.send({ type: "START", turn: greeting });
  assert.equal(mira.send({ type: "SEND" }), false, "not at the summary yet");
  assert.equal(mira.send({ type: "DRAFTED" }), false);
  mira.send({ type: "SAY", turn: summary, after: 1 });
  assert.equal(mira.send({ type: "SEND" }), true);
  assert.equal(mira.send({ type: "SEND" }), false, "already sending");
  assert.equal(mira.send({ type: "SAY", turn: greeting, after: 2 }), false, "no talking while sending");
  assert.equal(mira.send({ type: "DELIVERED" }), true);
  assert.equal(mira.get().name, "sent");
});

test("a failed send can be tried again; a finished one can only start over", () => {
  const mira = newConversation();
  mira.send({ type: "START", turn: greeting });
  mira.send({ type: "SAY", turn: summary, after: 1 });
  mira.send({ type: "SEND" });
  assert.equal(mira.send({ type: "FAILED" }), true);
  assert.equal(mira.send({ type: "RESTART", turn: greeting }), false);
  assert.equal(mira.send({ type: "SEND" }), true, "try again");
  mira.send({ type: "DELIVERED" });
  assert.equal(mira.send({ type: "SEND" }), false);
  assert.equal(mira.send({ type: "RESTART", turn: greeting }), true);
  const now = mira.get();
  assert.equal(now.name === "asking" && now.turn.step, "greeting");
});

test("handing the brief to the email app ends at drafted, which can start over", () => {
  const mira = newConversation();
  mira.send({ type: "START", turn: greeting });
  mira.send({ type: "SAY", turn: summary, after: 1 });
  assert.equal(mira.send({ type: "DRAFTED" }), true);
  assert.equal(mira.get().name, "drafted");
  assert.equal(mira.send({ type: "RESTART", turn: greeting }), true);
});

// ---------- The order of her questions ----------
test("questions come in order, skipping the type question for 'Something else'", () => {
  let brief = emptyBrief;
  const asked: Step[] = [];
  const answer = (field: keyof Brief, value: string) => (brief = withAnswer(brief, field, value));
  asked.push(nextStep(brief)); answer("service", "Website");
  asked.push(nextStep(brief)); answer("project_type", "Portfolio");
  asked.push(nextStep(brief)); answer("stage", "Just an idea");
  asked.push(nextStep(brief)); answer("timeline", "ASAP");
  asked.push(nextStep(brief)); answer("budget", UNSURE);
  asked.push(nextStep(brief)); answer("details", "");
  asked.push(nextStep(brief)); brief = { ...brief, name: "Jane", contact: "012-345 6789" };
  asked.push(nextStep(brief));
  assert.deepEqual(asked, ["service", "project_type", "stage", "timeline", "budget", "details", "contact", "summary"]);
  assert.equal(nextStep(withAnswer(emptyBrief, "service", "Something else")), "stage");
});

test("every step's Back leads to a real earlier step", () => {
  for (const step of steps) {
    const back = previousStep(step, full);
    if (step === "greeting" || step === "done") assert.equal(back, null, step);
    else assert.ok(back && steps.indexOf(back) < steps.indexOf(step), `${step} -> ${back}`);
  }
  assert.equal(previousStep("stage", { ...full, service: "Something else", project_type: null }), "service");
});

test("going back to a question asks it, and what depends on it, again", () => {
  const afterService = withoutAnswer(full, "service");
  assert.deepEqual([afterService.service, afterService.project_type, afterService.budget], [null, null, null]);
  assert.equal(afterService.stage, full.stage, "unrelated answers are kept");
  assert.equal(nextStep(afterService), "service");
  assert.equal(nextStep(withoutAnswer(full, "timeline")), "timeline");
  assert.equal(nextStep(withoutAnswer(full, "details")), "details");
  assert.equal(nextStep(withoutAnswer(full, "contact")), "contact");
  // Changing the service forgets the type and budget that belonged to the old one.
  const changed = withAnswer(full, "service", "Mobile app");
  assert.deepEqual([changed.project_type, changed.budget], [null, null]);
});

test("every service has budget options, and the choices for each step exist", () => {
  for (const service of services) {
    const budgets = budgetsFor(service);
    assert.ok(budgets.length >= 3 && budgets.at(-1) === UNSURE, service);
    if (service !== "Something else") assert.ok(projectTypes[service]?.length, `${service} has no project types`);
  }
  assert.deepEqual(optionsFor("summary", full), [CONFIRM, CHANGE]);
  assert.ok(optionsFor("greeting", emptyBrief).includes(START));
  assert.deepEqual(optionsFor("details", full), []);
});

// ---------- Her written replies ----------
test("every written reply is made of lines that get recorded", () => {
  const recordable = new Set(recordedLines);
  const check = (turn: Turn, label: string) => {
    assert.ok(turn.recorded?.length, `${label}: nothing to say`);
    for (const line of turn.recorded) assert.ok(recordable.has(line), `${label}: "${line}" is not in recordedLines, so it would never be recorded`);
    assert.equal(turn.reply, turn.recorded.join(" "), label);
  };
  check(greeting, "greeting");
  check(scriptedTurn("greeting", emptyBrief, { kind: "start" }, { ...ctx, returning: true }), "greeting (returning)");
  for (const option of optionsFor("greeting", emptyBrief)) check(scriptedTurn("greeting", emptyBrief, { kind: "tap", text: option }, ctx), `greeting: ${option}`);
  // Walk every service through every step, tapping every option.
  for (const service of services) {
    for (const seenWork of [false, true]) {
      let brief = withAnswer(emptyBrief, "service", service);
      let turn = scriptedTurn("service", brief, { kind: "tap", text: service }, { ...ctx, seenWork });
      check(turn, `${service}: after service`);
      while (turn.step !== "summary") {
        const step = turn.step;
        assert.equal(step, nextStep(brief), `${service}: she asks the next unanswered question`);
        if (step === "details") {
          for (const details of ["a shop", ""]) check(scriptedTurn(step, { ...brief, details }, { kind: "form" }, ctx), `${service}: details "${details}"`);
          brief = { ...brief, details: "" };
          turn = scriptedTurn(step, brief, { kind: "form" }, ctx);
        } else if (step === "contact") {
          brief = { ...brief, name: "Jane", contact: "jane@example.com" };
          turn = scriptedTurn(step, brief, { kind: "form" }, ctx);
        } else {
          const options = optionsFor(step, brief);
          assert.ok(options.length, `${service}: no options at ${step}`);
          const field = step as "project_type" | "stage" | "timeline" | "budget";
          for (const option of options) check(scriptedTurn(step, withAnswer(brief, field, option), { kind: "tap", text: option }, ctx), `${service}: ${step} = ${option}`);
          brief = withAnswer(brief, field, options[0]);
          turn = scriptedTurn(step, brief, { kind: "tap", text: options[0] }, ctx);
        }
        check(turn, `${service}: after ${step}`);
      }
    }
  }
  check(scriptedTurn("summary", full, { kind: "tap", text: CHANGE }, ctx), "change something");
  check(scriptedTurn("service", emptyBrief, { kind: "text", text: "hello?" }, ctx), "typed without AI");
});

test("pressing Back gets a playful remark, then the earlier question, without repeating itself", () => {
  const remarks = new Set<string>();
  for (let backs = 0; backs < 6; backs++) {
    const turn = scriptedTurn("budget", withoutAnswer(full, "budget"), { kind: "back" }, { ...ctx, backs });
    assert.equal(turn.step, "budget");
    assert.equal(turn.recorded?.[1], lines.ask.budget);
    remarks.add(turn.recorded![0]);
  }
  assert.ok(remarks.size >= 4, `only ${remarks.size} different remarks in 6 presses`);
  for (const step of steps) {
    if (step === "done" || step === "summary") continue;
    const turn = scriptedTurn(step, withoutAnswer(full, step), { kind: "back" }, ctx);
    assert.equal(turn.step, step);
    assert.ok(turnAt(step, turn.brief) && turn.recorded?.length === 2, step);
  }
});
