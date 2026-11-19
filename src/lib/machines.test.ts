// Tests for the smaller state machines: the copy buttons, the screens strip
// and the admin editor's activity. Run with `npm test` (no browser needed).
import assert from "node:assert/strict";
import { test } from "node:test";
import { activity, type Activity, type ActivityEvent } from "./admin/activityMachine";
import { copyPhases, type CopyEvent, type CopyPhase } from "./copyMachine";
import { createMachine } from "./machine";
import { railModes, type RailEvent, type RailMode } from "./railMachine";

test("copy: a second click while copying is ignored", () => {
  const copy = createMachine<CopyPhase, CopyEvent>({ name: "idle" }, copyPhases);
  assert.equal(copy.send({ type: "COPY" }), true);
  assert.equal(copy.send({ type: "COPY" }), false);
  assert.equal(copy.send({ type: "DONE" }), true);
  assert.equal(copy.get().name, "copied");
});

test("copy: copying again from copied or failed starts over; RESET only ends a result", () => {
  const copy = createMachine<CopyPhase, CopyEvent>({ name: "idle" }, copyPhases);
  assert.equal(copy.send({ type: "RESET" }), false, "nothing to reset yet");
  copy.send({ type: "COPY" });
  assert.equal(copy.send({ type: "RESET" }), false, "can't reset mid-copy");
  copy.send({ type: "FAIL" });
  assert.equal(copy.get().name, "failed");
  assert.equal(copy.send({ type: "COPY" }), true);
  copy.send({ type: "DONE" });
  assert.equal(copy.send({ type: "RESET" }), true);
  assert.equal(copy.get().name, "idle");
});

test("strip: pointing focuses a screen, and letting go drifts again", () => {
  const rail = createMachine<RailMode, RailEvent>({ name: "drifting" }, railModes);
  assert.equal(rail.send({ type: "LET_GO" }), false, "nothing to let go of");
  rail.send({ type: "POINT", index: 2 });
  assert.deepEqual(rail.get(), { name: "focused", index: 2 });
  rail.send({ type: "TAP", index: 5 });
  assert.deepEqual(rail.get(), { name: "focused", index: 5 });
  rail.send({ type: "LET_GO" });
  assert.equal(rail.get().name, "drifting");
});

test("strip: while dragging, pointing, tapping and letting go are ignored", () => {
  const rail = createMachine<RailMode, RailEvent>({ name: "focused", index: 1 }, railModes);
  rail.send({ type: "GRAB" });
  assert.equal(rail.get().name, "dragging");
  assert.equal(rail.send({ type: "POINT", index: 3 }), false);
  assert.equal(rail.send({ type: "TAP", index: 3 }), false);
  assert.equal(rail.send({ type: "LET_GO" }), false);
  assert.equal(rail.send({ type: "DROP" }), true);
  assert.equal(rail.get().name, "drifting");
  assert.equal(rail.send({ type: "DROP" }), false, "only a drag can be dropped");
});

test("strip: RESET returns to drifting from anywhere", () => {
  for (const start of [{ name: "focused", index: 0 }, { name: "dragging" }] as RailMode[]) {
    const rail = createMachine<RailMode, RailEvent>(start, railModes);
    assert.equal(rail.send({ type: "RESET" }), true);
    assert.equal(rail.get().name, "drifting");
  }
});

test("admin: one change at a time", () => {
  const admin = createMachine<Activity, ActivityEvent>({ name: "idle", notice: null }, activity);
  assert.equal(admin.send({ type: "START", task: "saving" }), true);
  assert.equal(admin.send({ type: "START", task: "deleting" }), false, "no delete during a save");
  assert.equal(admin.send({ type: "START", task: "moving" }), false, "no reorder during a save");
  assert.equal(admin.send({ type: "CLEAR" }), false);
  admin.send({ type: "FINISH", notice: { tone: "done", text: "Changes saved." } });
  assert.deepEqual(admin.get(), { name: "idle", notice: { tone: "done", text: "Changes saved." } });
  assert.equal(admin.send({ type: "FINISH", notice: null }), false, "only a running change can finish");
});

test("admin: choosing another project clears the notice", () => {
  const admin = createMachine<Activity, ActivityEvent>({ name: "idle", notice: { tone: "error", text: "Nope." } }, activity);
  assert.equal(admin.send({ type: "CLEAR" }), true);
  assert.deepEqual(admin.get(), { name: "idle", notice: null });
  assert.equal(admin.send({ type: "CLEAR" }), false, "already clear");
});
