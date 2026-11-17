// Mira's voice.
//
// Her written lines are recordings (made by `npm run voice`), so they start at
// once. Replies the AI writes live have no recording; for those, the same
// Kokoro voice runs in the visitor's browser (see kokoro.worker.ts), once it
// has been switched on with enableLiveVoice() and has finished loading.
//
// Browsers only let a page make sound after the visitor has clicked, tapped or
// pressed a key somewhere on the site. Arriving on the Contact page through a
// link counts, so Mira speaks straight away. If someone opens the Contact page
// directly, her first line waits and plays on their first click, tap or key press.
import recorded from "@/data/mira-audio.json";
import { createMachine } from "./machine";

const lines = recorded.lines as Record<string, { src: string; seconds: number }>;
const GAP = 0.18; // seconds of quiet between two lines
const LIVE_WAIT_MS = 2500; // longest wait for the in-browser voice before going on without it

// Resolves with null if the promise takes longer than `ms`.
const withinTime = <T,>(promise: Promise<T | null>, ms: number) =>
  Promise.race([promise, new Promise<null>((done) => setTimeout(() => done(null), ms))]);

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let wave: Uint8Array<ArrayBuffer> | null = null;
let playing: AudioBufferSourceNode[] = [];
let turn = 0; // goes up each time speech is started or stopped, so stale requests give up
let waiting: string[] | null = null; // lines held back until the browser allows sound
let endsAt = 0;
const loaded = new Map<string, Promise<AudioBuffer>>();

function context() {
  if (!ctx) {
    ctx = new AudioContext();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.connect(ctx.destination);
    wave = new Uint8Array(analyser.fftSize);
    for (const event of ["pointerup", "keydown", "touchend"]) window.addEventListener(event, unlock, { capture: true });
  }
  return ctx;
}

// The visitor's first interaction: sound is allowed now, so say the held line,
// unless that same interaction moves the conversation on (a short pause to see).
function unlock() {
  if (!ctx || ctx.state === "running") return;
  void ctx.resume().then(() => {
    setTimeout(() => {
      if (waiting) void speak(waiting);
    }, 250);
  });
}

function load(src: string) {
  let buffer = loaded.get(src);
  if (!buffer) {
    buffer = fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Missing audio ${src}`);
        return res.arrayBuffer();
      })
      .then((data) => context().decodeAudioData(data));
    buffer.catch(() => loaded.delete(src)); // allow another try later
    loaded.set(src, buffer);
  }
  return buffer;
}

/** Call from a click or tap: lets the page play sound from now on. */
export function wakeAudio() {
  const audio = context();
  if (audio.state !== "running") void audio.resume().catch(() => {});
}

// ---------- The live voice, for lines without a recording ----------
// Where the in-browser Kokoro voice stands:
// - off:         not asked for yet.
// - unavailable: this device or connection is too weak for it (final).
// - loading:     the model is downloading and starting up.
// - ready:       it can speak.
// - failed:      it broke while loading or speaking (final).
type Live = { name: "off" } | { name: "unavailable" } | { name: "loading" } | { name: "ready" } | { name: "failed" };
type LiveEvent = { type: "LOAD" } | { type: "SKIP" } | { type: "READY" } | { type: "BROKE" };
const live = createMachine<Live, LiveEvent>(
  { name: "off" },
  {
    off: { LOAD: () => ({ name: "loading" }), SKIP: () => ({ name: "unavailable" }) },
    loading: { READY: () => ({ name: "ready" }), BROKE: () => ({ name: "failed" }) },
    ready: { BROKE: () => ({ name: "failed" }) },
    unavailable: {},
    failed: {},
  },
);

let worker: Worker | null = null;
let jobId = 0;
const jobs = new Map<number, (buffer: AudioBuffer | null) => void>();

// The voice broke: nothing more will come back, so let every waiting line go (unspoken).
function liveBroke() {
  if (!live.send({ type: "BROKE" })) return;
  for (const done of jobs.values()) done(null);
  jobs.clear();
  worker?.terminate();
  worker = null;
}

/** Start loading the in-browser voice. Safe to call more than once: only the first call does anything. */
export function enableLiveVoice() {
  if (!live.can("LOAD")) return;
  // It is a large download and heavy work: skip it on data-saver, slow connections and weak devices.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const weak = connection?.saveData || /2g|3g/.test(connection?.effectiveType ?? "") || (navigator.hardwareConcurrency ?? 4) < 4;
  if (typeof Worker === "undefined" || weak) return void live.send({ type: "SKIP" });
  live.send({ type: "LOAD" });
  try {
    worker = new Worker(new URL("./kokoro.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return liveBroke();
  }
  worker.onmessage = ({ data }: MessageEvent<{ ready?: boolean; id?: number; samples?: Float32Array; rate?: number }>) => {
    if (data.ready !== undefined) {
      if (data.ready) live.send({ type: "READY" });
      else liveBroke();
      return;
    }
    const done = jobs.get(data.id!);
    jobs.delete(data.id!);
    if (!done) return;
    if (!data.samples || !data.rate) return done(null);
    const buffer = context().createBuffer(1, data.samples.length, data.rate);
    buffer.getChannelData(0).set(data.samples);
    done(buffer);
  };
  worker.onerror = liveBroke;
  worker.postMessage({ type: "load" });
}

/** For debugging: whether sound is allowed yet, and where the in-browser voice stands. */
export function voiceStatus() {
  return { sound: ctx?.state ?? "not started", liveVoice: live.get().name, speaking: isSpeaking() };
}

function synth(text: string) {
  return new Promise<AudioBuffer | null>((resolve) => {
    if (!worker) return resolve(null);
    const id = ++jobId;
    jobs.set(id, resolve);
    worker.postMessage({ type: "say", id, text, speed: recorded.voice.speed });
  });
}

// One sentence at a time, so the first words can start while the rest is prepared.
const sentences = (text: string) => text.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];

// ---------- Speaking ----------
/** How long these lines take to say, in seconds, when all of them are recorded (0 otherwise). */
export function speechSeconds(texts: string[]) {
  if (texts.length === 0 || texts.some((t) => !lines[t])) return 0;
  return texts.reduce((sum, t) => sum + lines[t].seconds, 0) + GAP * (texts.length - 1);
}

/** Fetch recordings ahead of time so they start without a delay. */
export function preload(texts: string[]) {
  for (const t of texts) if (lines[t]) void load(lines[t].src).catch(() => {});
}

// A line without a recording: in development, say so (once per line), since it
// means `npm run voice` hasn't been run since the line was written or changed.
const warned = new Set<string>();
function missing(text: string) {
  if (process.env.NODE_ENV !== "production" && !warned.has(text)) {
    warned.add(text);
    console.warn(`Mira has no recording for: "${text}". Restart \`npm run dev\` or run \`npm run voice\` to record it.`);
  }
}

// Last resort for a line with neither a recording nor the in-browser Kokoro
// voice: the browser's own speech, so Mira is never silent. It sounds
// different from her usual voice.
const FALLBACK_VOICES = [/natural/i, /aria/i, /jenny/i, /samantha/i, /google us english/i, /zira/i, /female/i];
function sayWithBrowser(text: string) {
  if (typeof speechSynthesis === "undefined") return;
  const english = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const line = new SpeechSynthesisUtterance(text);
  const chosen = FALLBACK_VOICES.map((p) => english.find((v) => p.test(v.name))).find(Boolean) ?? english[0];
  if (chosen) line.voice = chosen;
  line.lang = chosen?.lang ?? "en-US";
  line.rate = 1.05;
  line.pitch = 1.15;
  speechSynthesis.speak(line);
}

/**
 * Say these lines in order, replacing anything being said. Recorded lines play
 * from their recordings; others use the in-browser Kokoro voice when it is
 * ready, and otherwise the browser's own voice.
 */
export async function speak(texts: string[], { aiWritten = false }: { aiWritten?: boolean } = {}) {
  stopSpeaking();
  // For tests and debugging: what she was last asked to say.
  if (process.env.NODE_ENV !== "production") (window as Window & { __miraSaid?: string[][] }).__miraSaid?.push(texts);
  const mine = turn;
  const unrecorded = texts.filter((t) => !lines[t]);
  // A written line without a recording is a mistake (`npm run voice` wasn't
  // run): say so, and read it in the browser's own voice rather than not at all.
  if (!aiWritten && unrecorded.length) {
    for (const t of unrecorded) missing(t);
    if (live.get().name !== "ready") {
      sayWithBrowser(texts.join(" "));
      return;
    }
  }
  // Lines the AI wrote live never have recordings. They're voiced in her own
  // voice only when the in-browser voice is ready and quick; otherwise they're
  // shown but not spoken, so she never switches to a different voice and her
  // recorded question isn't kept waiting.
  const parts: Promise<AudioBuffer | null>[] = [];
  for (const t of texts) {
    if (lines[t]) parts.push(load(lines[t].src).catch(() => null));
    else if (live.get().name === "ready") for (const sentence of sentences(t)) parts.push(withinTime(synth(sentence), LIVE_WAIT_MS));
  }
  if (parts.length === 0) return;
  const audio = context();
  // Switching sound on takes a moment; wait for it (briefly) rather than
  // finding it still off when the first recording is ready.
  if (audio.state !== "running") {
    await Promise.race([audio.resume().catch(() => {}), new Promise((done) => setTimeout(done, 500))]);
    if (mine !== turn) return;
  }

  let at = 0;
  for (const part of parts) {
    const buffer = await part;
    if (mine !== turn) return;
    if (!buffer) continue;
    if (audio.state !== "running") {
      waiting = texts; // sound still not allowed: say it on the visitor's next click or tap
      return;
    }
    const start = Math.max(audio.currentTime + 0.05, at);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser!);
    source.start(start);
    playing.push(source);
    at = start + buffer.duration + GAP;
    endsAt = at - GAP;
  }
}

export function stopSpeaking() {
  turn++;
  waiting = null;
  endsAt = 0;
  for (const source of playing) {
    try {
      source.stop();
    } catch {
      // already finished
    }
  }
  playing = [];
  if (jobs.size) worker?.postMessage({ type: "cancel" });
  if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking) speechSynthesis.cancel();
}

export function isSpeaking() {
  return !!ctx && ctx.state === "running" && ctx.currentTime < endsAt;
  // (The browser's own voice isn't counted: it can't drive the orb, so the typing does.)
}

/** How loud Mira's voice is at this moment, 0 to 1. Drives the orb. */
export function loudness() {
  if (!isSpeaking() || !analyser || !wave) return 0;
  analyser.getByteTimeDomainData(wave);
  let sum = 0;
  for (const v of wave) sum += ((v - 128) / 128) ** 2;
  return Math.min(1, Math.sqrt(sum / wave.length) * 4.5);
}
