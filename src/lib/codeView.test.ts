import { test } from "node:test";
import assert from "node:assert/strict";
import { codeView } from "./codeView";

const reset = () => {
  // Walk back to "off" from wherever an earlier test left it.
  for (const type of ["TOGGLE", "LEFT", "ENTERED", "TOGGLE", "LEFT"] as const) {
    if (codeView.get().name === "off") return;
    codeView.send({ type });
  }
};

test("code view opens and closes through its transitions", () => {
  reset();
  assert.equal(codeView.send({ type: "TOGGLE" }), true);
  assert.equal(codeView.get().name, "entering");
  assert.equal(codeView.send({ type: "ENTERED" }), true);
  assert.equal(codeView.get().name, "on");
  assert.equal(codeView.send({ type: "TOGGLE" }), true);
  assert.equal(codeView.get().name, "leaving");
  assert.equal(codeView.send({ type: "LEFT" }), true);
  assert.equal(codeView.get().name, "off");
});

test("a press while it sweeps in or out is ignored", () => {
  reset();
  codeView.send({ type: "TOGGLE" });
  assert.equal(codeView.send({ type: "TOGGLE" }), false, "ignored while entering");
  codeView.send({ type: "ENTERED" });
  codeView.send({ type: "TOGGLE" });
  assert.equal(codeView.send({ type: "TOGGLE" }), false, "ignored while leaving");
  assert.equal(codeView.get().name, "leaving");
  codeView.send({ type: "LEFT" });
});

test("Esc and a page change close it, but only once it is open", () => {
  reset();
  assert.equal(codeView.send({ type: "ESC" }), false);
  assert.equal(codeView.send({ type: "NAVIGATE" }), false);
  codeView.send({ type: "TOGGLE" });
  codeView.send({ type: "ENTERED" });
  assert.equal(codeView.send({ type: "ESC" }), true);
  assert.equal(codeView.get().name, "leaving");
  codeView.send({ type: "LEFT" });
  codeView.send({ type: "TOGGLE" });
  codeView.send({ type: "ENTERED" });
  assert.equal(codeView.send({ type: "NAVIGATE" }), true);
  assert.equal(codeView.get().name, "leaving");
  codeView.send({ type: "LEFT" });
});
