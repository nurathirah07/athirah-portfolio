import { test } from "node:test";
import assert from "node:assert/strict";
import { siteMode } from "./siteMode";

const toSite = () => {
  for (let i = 0; i < 4 && siteMode.get().name !== "site"; i++) {
    siteMode.send({ type: "ARRIVED" });
    siteMode.send({ type: "SITE" });
  }
};

test("switches to Story and back through its transitions", () => {
  toSite();
  assert.equal(siteMode.send({ type: "STORY" }), true);
  assert.equal(siteMode.get().name, "entering");
  assert.equal(siteMode.send({ type: "ARRIVED" }), true);
  assert.equal(siteMode.get().name, "story");
  assert.equal(siteMode.send({ type: "SITE" }), true);
  assert.equal(siteMode.get().name, "leaving");
  assert.equal(siteMode.send({ type: "ARRIVED" }), true);
  assert.equal(siteMode.get().name, "site");
});

test("presses mid-transition are ignored", () => {
  toSite();
  siteMode.send({ type: "STORY" });
  assert.equal(siteMode.send({ type: "SITE" }), false, "can't go back while entering");
  assert.equal(siteMode.send({ type: "STORY" }), false);
  siteMode.send({ type: "ARRIVED" });
  siteMode.send({ type: "SITE" });
  assert.equal(siteMode.send({ type: "STORY" }), false, "can't re-enter while leaving");
  siteMode.send({ type: "ARRIVED" });
  assert.equal(siteMode.get().name, "site");
});

test("Esc and a page change leave Story mode", () => {
  toSite();
  assert.equal(siteMode.send({ type: "ESC" }), false, "nothing to leave on the normal site");
  for (const type of ["ESC", "NAVIGATE"] as const) {
    siteMode.send({ type: "STORY" });
    siteMode.send({ type: "ARRIVED" });
    assert.equal(siteMode.send({ type }), true);
    assert.equal(siteMode.get().name, "leaving");
    siteMode.send({ type: "ARRIVED" });
  }
});
