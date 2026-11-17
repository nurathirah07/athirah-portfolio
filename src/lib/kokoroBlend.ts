// Lets Kokoro speak in a blend of its voices. Kokoro describes each voice with
// a table of numbers (its "style"); averaging two voices' tables gives a voice
// in between. Used by `npm run voice` and by the in-browser voice, so both
// sound the same.
import { RawAudio, Tensor } from "@huggingface/transformers";
import type { KokoroTTS } from "kokoro-js";

const ROWS = 510; // one style row per possible sentence length
const WIDTH = 256;

/** Mixes voice styles by weight. Each style is a voice's .bin file read as numbers. */
export function mixStyles(parts: { style: Float32Array; weight: number }[]): Float32Array {
  const out = new Float32Array(ROWS * WIDTH);
  for (const { style, weight } of parts) {
    if (style.length !== out.length) throw new Error("Unexpected voice file size");
    for (let i = 0; i < out.length; i++) out[i] += style[i] * weight;
  }
  return out;
}

/** Makes `tts` speak with this style instead of a named voice. Pass any English voice name to generate(). */
export function applyStyle(tts: KokoroTTS, style: Float32Array) {
  tts.generate_from_ids = async function (ids, { speed = 1 } = {}) {
    // Same steps as the library's own method, with our style in place of a voice file.
    const at = WIDTH * Math.min(Math.max(ids.dims.at(-1)! - 2, 0), ROWS - 1);
    const { waveform } = await this.model({
      input_ids: ids,
      style: new Tensor("float32", style.slice(at, at + WIDTH), [1, WIDTH]),
      speed: new Tensor("float32", [speed], [1]),
    });
    return new RawAudio(waveform.data as Float32Array, 24000);
  };
}
