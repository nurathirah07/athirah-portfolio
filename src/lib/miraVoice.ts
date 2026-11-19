// Mira's voice.
//
// Every line she says is a recording (made by `npm run voice`), so it starts at once.
//
// Browsers only let a page make sound after the visitor has clicked, tapped or
// pressed a key somewhere on the site. Arriving on the Contact page through a
// link counts, so Mira speaks straight away. If someone opens the Contact page
// directly, her first line waits and plays on their first click, tap or key press.
import recorded from "@/data/mira-audio.json";

const lines = recorded.lines as Record<string, { src: string; seconds: number }>;
const GAP = 0.18; // seconds of quiet between two lines

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

/** For debugging: whether sound is allowed yet, and whether she is speaking. */
export function voiceStatus() {
  return { sound: ctx?.state ?? "not started", speaking: isSpeaking() };
}

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

// Last resort for a line without a recording: the browser's own speech, so
// Mira is never silent. It sounds
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
 * Say these lines in order, replacing anything being said, from their
 * recordings (or, if one is missing, in the browser's own voice).
 */
export async function speak(texts: string[]) {
  stopSpeaking();
  // For tests and debugging: what she was last asked to say.
  if (process.env.NODE_ENV !== "production") (window as Window & { __miraSaid?: string[][] }).__miraSaid?.push(texts);
  const mine = turn;
  const unrecorded = texts.filter((t) => !lines[t]);
  // A written line without a recording is a mistake (`npm run voice` wasn't
  // run): say so, and read it in the browser's own voice rather than not at all.
  if (unrecorded.length) {
    for (const t of unrecorded) missing(t);
    sayWithBrowser(texts.join(" "));
    return;
  }
  const parts = texts.map((t) => load(lines[t].src).catch(() => null));
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
