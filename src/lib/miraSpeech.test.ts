// Tests for tidying the live AI's words for Mira. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { budgetsFor, emptyBrief, lines, projectTypes, services, stages, timelines } from "@/data/assistant";
import { matchOption, questionFor, reactionOf, speakable } from "./miraSpeech";

test("spelled-out words become natural contractions", () => {
  assert.equal(speakable("That is so exciting, let us get started!"), "That's so exciting, let's get started!");
  assert.equal(speakable("Let us begin. I am so glad you are here."), "Let's begin. I'm so glad you're here.");
  assert.equal(speakable("We will sort it out, do not worry."), "We'll sort it out, don't worry.");
});

test("contractions are not forced where they would be wrong", () => {
  assert.equal(speakable("Here it is."), "Here it is.");
  assert.equal(speakable("Yes, I am!"), "Yes, I am!");
  assert.equal(speakable("That is what it is."), "That's what it is.");
});

test("links, symbols and emojis are removed before speaking", () => {
  assert.equal(speakable("**Great** choice 🎉! See https://example.com now"), "Great choice! See now");
});

test("free answers map to the right option, or to none", () => {
  assert.equal(matchOption("an online store for my bakery", projectTypes["Website"]), "Online store");
  assert.equal(matchOption("online store", projectTypes["Website"]), "Online store");
  assert.equal(matchOption("A booking app for my salon", projectTypes["Mobile app"]), "Booking app");
  assert.equal(matchOption("mobile app", services), "Mobile app");
  assert.equal(matchOption("a web app / system for stock", services), "Web app / system");
  assert.equal(matchOption("flexible", timelines), "Flexible");
  assert.equal(matchOption("just an idea", stages), "Just an idea");
  assert.equal(matchOption("not sure yet", budgetsFor("Website")), "Not sure yet");
  assert.equal(matchOption("a bakery", projectTypes["Website"]), null, "no guessing");
  assert.equal(matchOption("", services), null);
});

test("the expected question exists for every step", () => {
  assert.equal(questionFor("service", emptyBrief), lines.ask.service);
  assert.equal(questionFor("project_type", { ...emptyBrief, service: "Mobile app" }), lines.askType["Mobile app"]);
  assert.equal(questionFor("details", emptyBrief, true), lines.ask.detailsSeenWork);
});

test("her reaction can be separated from her question", () => {
  assert.equal(reactionOf("Ooh, a salon app, how fun! When would you like it ready?"), "Ooh, a salon app, how fun!");
  assert.equal(reactionOf("When would you like it ready?"), "");
});

test("clear phrases fill in answers the AI might miss, unclear ones don't", async () => {
  const { clearAnswers } = await import("./miraSpeech");
  assert.deepEqual(clearAnswers("a booking app for my salon. we already have a design, no rush"), { timeline: "Flexible", stage: "Have a design" });
  assert.deepEqual(clearAnswers("need it ASAP"), { timeline: "ASAP" });
  assert.deepEqual(clearAnswers("ready in a few weeks, it's just an idea"), { timeline: "Within 1 month", stage: "Just an idea" });
  assert.deepEqual(clearAnswers("redo our old website"), { stage: "Have an existing site" });
  assert.deepEqual(clearAnswers("a shop for my cakes"), {});
});

test("only the visitor's own words can send her back to change an answer", async () => {
  const { wantsChange } = await import("./miraSpeech");
  assert.equal(wantsChange("actually make it a mobile app instead"), true);
  assert.equal(wantsChange("can I change the budget?"), true);
  assert.equal(wantsChange("a booking app for my salon, no rush"), false);
  assert.equal(wantsChange("next month please"), false);
});
