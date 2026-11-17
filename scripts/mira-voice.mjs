// Records Mira's written lines in her voice. Run with:  npm run voice
//
// It reads every line in src/data/assistant.ts, records the ones that have no
// audio yet into public/audio/mira, removes recordings of lines that are no
// longer used, and writes the list the site reads (src/data/mira-audio.json).
// It also saves her blended voice (public/audio/mira/voice.bin), which the
// in-browser voice uses for replies written live by AI.
// The first run downloads the voice model (about 90 MB) to this computer.
//
// Run it again whenever you change Mira's lines or her voice.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { recordedLines, voice } from "../src/data/assistant.ts";
import { mixStyles, applyStyle } from "../src/lib/kokoroBlend.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const folder = join(root, "public", "audio", "mira");
const RATE = 24000; // Kokoro's sample rate

// A plain 16-bit mono WAV file: half the size of the model's own 32-bit output.
function wav16(samples, rate) {
  if (rate !== RATE) throw new Error(`Unexpected sample rate ${rate}`);
  const out = Buffer.alloc(44 + samples.length * 2);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + samples.length * 2, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16); // format block size
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(1, 22); // mono
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28); // bytes per second
  out.writeUInt16LE(2, 32); // bytes per sample
  out.writeUInt16LE(16, 34); // bits per sample
  out.write("data", 36);
  out.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    out.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return out;
}

mkdirSync(folder, { recursive: true });

// Blend the voices, and save the blend for the in-browser voice.
const voices = join(dirname(createRequire(import.meta.url).resolve("kokoro-js")), "..", "voices");
const style = mixStyles(
  voice.mix.map(([name, weight]) => {
    const file = readFileSync(join(voices, `${name}.bin`));
    return { style: new Float32Array(file.buffer, file.byteOffset, file.byteLength / 4), weight };
  }),
);
writeFileSync(join(folder, "voice.bin"), Buffer.from(style.buffer));
// The voice and speed are part of each file's name, so changing them re-records everything.
const signature = JSON.stringify(voice);
const fileFor = (text) => `${createHash("sha1").update(`${signature}|${text}`).digest("hex").slice(0, 12)}.wav`;

// The voice model is only loaded when there is something to record, so a run
// with nothing new takes a moment (it runs every time `npm run dev` starts).
const todo = [...new Set(recordedLines)].filter((text) => !existsSync(join(folder, fileFor(text))));
let tts = null;
if (todo.length) {
  const label = voice.mix.map(([name, weight]) => `${Math.round(weight * 100)}% ${name}`).join(" + ");
  console.log(`Recording ${todo.length} new line(s) for Mira (voice: ${label}, speed ${voice.speed})…`);
  const { KokoroTTS } = await import("kokoro-js");
  tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
  applyStyle(tts, style);
}

const lines = {};
const keep = new Set();
let recorded = 0;
for (const text of new Set(recordedLines)) {
  const name = fileFor(text);
  const file = join(folder, name);
  keep.add(name);
  let seconds;
  if (existsSync(file)) {
    seconds = (statSync(file).size - 44) / 2 / RATE;
  } else {
    const audio = await tts.generate(text, { voice: "af_heart", speed: voice.speed }); // the name only picks American English
    writeFileSync(file, wav16(audio.audio, audio.sampling_rate));
    seconds = audio.audio.length / audio.sampling_rate;
    recorded++;
    console.log(`  recorded  ${text}`);
  }
  lines[text] = { src: `/audio/mira/${name}`, seconds: Math.round(seconds * 100) / 100 };
}

let removed = 0;
for (const old of readdirSync(folder)) {
  if (old.endsWith(".wav") && !keep.has(old)) {
    rmSync(join(folder, old));
    removed++;
  }
}

writeFileSync(join(root, "src", "data", "mira-audio.json"), `${JSON.stringify({ voice, lines }, null, 2)}\n`);
console.log(
  recorded || removed
    ? `Mira's voice: ${Object.keys(lines).length} lines ready (${recorded} newly recorded, ${removed} old recordings removed).`
    : `Mira's voice: all ${Object.keys(lines).length} lines are recorded.`,
);
