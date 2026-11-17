// Runs the Kokoro voice in the visitor's browser, off the main thread, to say
// replies the AI writes on the spot (which can't be recorded ahead of time).
// Loaded only when live AI replies are in use. The model (about 90 MB) is
// downloaded from Hugging Face once and then kept by the browser.
import { KokoroTTS } from "kokoro-js";
import { applyStyle } from "./kokoroBlend";

type Job = { id: number; text: string; speed: number };
type Message = { type: "load" } | { type: "cancel" } | ({ type: "say" } & Job);

const scope = self as unknown as {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<Message>) => void) | null;
};

let model: Promise<KokoroTTS> | null = null;
let queue: Job[] = [];
let busy = false;

// The model, set to Mira's blended voice (saved by `npm run voice`).
const load = () =>
  (model ??= Promise.all([
    KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "wasm" }),
    fetch("/audio/mira/voice.bin").then((res) => {
      if (!res.ok) throw new Error("Mira's voice file is missing; run npm run voice");
      return res.arrayBuffer();
    }),
  ]).then(([tts, data]) => {
    applyStyle(tts, new Float32Array(data));
    return tts;
  }));

async function work() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift()!;
    try {
      const tts = await load();
      const audio = await tts.generate(job.text, { voice: "af_heart", speed: job.speed }); // the name only picks American English
      scope.postMessage({ id: job.id, samples: audio.audio, rate: audio.sampling_rate }, [audio.audio.buffer]);
    } catch (error) {
      scope.postMessage({ id: job.id, error: String(error) });
    }
  }
  busy = false;
}

scope.onmessage = ({ data }) => {
  if (data.type === "load") {
    load().then(
      () => scope.postMessage({ ready: true }),
      (error) => {
        model = null;
        scope.postMessage({ ready: false, error: String(error) });
      },
    );
  } else if (data.type === "cancel") {
    // Whatever was waiting is no longer wanted.
    for (const job of queue) scope.postMessage({ id: job.id, error: "cancelled" });
    queue = [];
  } else {
    queue.push({ id: data.id, text: data.text, speed: data.speed });
    void work();
  }
};
