// Checks that every line Mira can say has a recording in her current voice.
// If this fails, a line was written or changed without recording it: run
// `npm run voice` (it also runs by itself each time `npm run dev` starts).
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { recordedLines, voice } from "@/data/assistant";

const root = new URL("../../", import.meta.url);
const recorded = JSON.parse(readFileSync(new URL("src/data/mira-audio.json", root), "utf8")) as {
  voice: unknown;
  lines: Record<string, { src: string; seconds: number }>;
};

test("the recordings were made with the current voice settings", () => {
  assert.deepEqual(recorded.voice, voice, "the voice in src/data/assistant.ts changed; run `npm run voice`");
  assert.ok(existsSync(new URL("public/audio/mira/voice.bin", root)), "the blended voice file is missing; run `npm run voice`");
});

test("every line Mira can say has a recording", () => {
  const missing = [...new Set(recordedLines)].filter((line) => !recorded.lines[line]);
  assert.deepEqual(missing, [], "lines without a recording; run `npm run voice`");
});

test("every recording's audio file exists and isn't empty", () => {
  for (const [line, { src, seconds }] of Object.entries(recorded.lines)) {
    const file = fileURLToPath(new URL(`public${src}`, root));
    assert.ok(existsSync(file), `no audio file for "${line}"`);
    assert.ok(statSync(file).size > 10_000 && seconds > 0.3, `the audio for "${line}" looks empty`);
  }
});
