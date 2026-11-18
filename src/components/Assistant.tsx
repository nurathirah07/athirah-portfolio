"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion } from "motion/react";
import MiraOrb from "@/components/MiraOrb";
import { CONFIRM, emptyBrief, fieldFor, lines, previousStep, steps, withAnswer, withoutAnswer, type Brief, type Input, type Mood, type Step } from "@/data/assistant";
import { site } from "@/data/site";
import { scriptedTurn, type Said, type Turn } from "@/lib/miraBrain";
import { conversation, type Phase, type PhaseEvent } from "@/lib/miraMachine";
import { useMachine } from "@/lib/useMachine";
import { enableLiveVoice, isSpeaking, wakeAudio, loudness, preload, speak, speechSeconds, stopSpeaking } from "@/lib/miraVoice";

const TYPE_MS = 26; // per letter when a line has no recording
const AI_WAIT_MS = 9000; // how long to wait for an AI reply before using a written one
const IDLE_MS = 30_000; // quiet time before she checks in
const MET = "mira:met"; // remembered on this device: has talked to Mira before
const SEEN_WORK = "mira:seenWork"; // remembered for this visit: has looked at the projects (set by VisitNote)

type Status = "talking" | "sending" | "sent" | "drafted" | "failed";
type AiReply = { ai: boolean; reply: string; spoken?: string[]; mood: Mood; step: Step; options: string[]; input: Input; brief: Brief };

// Mira: a friendly assistant who collects a short project brief, one question
// at a time. She says each line aloud while it types out, and the orb moves
// with her voice and shows her mood.
//
// Two brains can write her lines. The scripted one (src/lib/miraBrain.ts) uses
// her written, recorded lines and always works. When a Gemini key is set up,
// the live one (/api/mira) words her replies and understands typed messages;
// if it is slow or fails, the scripted one answers that turn instead.
//
// Where the conversation is (welcome, asking, thinking, sending…) is one state
// machine: src/lib/miraMachine.ts. This component reads its phase and sends it
// events; it never sets the phase directly. The phase and step are also on the
// section as data-phase / data-step / data-ready, for tests and debugging.
export default function Assistant() {
  const root = useRef<HTMLElement>(null);
  const inView = useInView(root, { once: true, amount: 0.4 });
  const reduce = !!useReducedMotion();

  // The conversation's phase, and plain names for what the rest of the component asks of it.
  const [phase, mira] = useMachine<Phase, PhaseEvent>({ name: "welcome" }, conversation);
  const started = phase.name !== "welcome"; // Start was pressed on the welcome screen
  const seen = inView && started; // Mira is on stage
  const turn = phase.name === "welcome" ? null : phase.turn; // the latest thing Mira said
  const turnId = phase.name === "welcome" ? 0 : phase.id;
  const thinking = phase.name === "thinking"; // waiting for the AI
  const status: Status = phase.name === "welcome" || phase.name === "asking" || phase.name === "thinking" ? "talking" : phase.name;
  const [aiOn, setAiOn] = useState(false);
  const [mood, setMood] = useState<Mood>("calm");
  const [aside, setAside] = useState<string | null>(null); // a short remark shown above the orb
  const [draft, setDraft] = useState(""); // a typed message
  const [details, setDetails] = useState("");
  const [person, setPerson] = useState({ name: "", contact: "" });
  const [copied, setCopied] = useState(false);

  // Things to remember that don't change what is on screen.
  const memo = useRef({
    history: [] as { who: "mira" | "visitor"; text: string }[],
    count: 0,
    backs: 0,
    seenWork: false,
    returning: false,
    aiFails: 0,
    idles: 0,
    pokes: 0,
    warnedLeaving: false,
  });
  const timers = useRef<{ mood?: ReturnType<typeof setTimeout>; aside?: ReturnType<typeof setTimeout>; idle?: ReturnType<typeof setTimeout> }>({});

  const energy = useMotionValue(0); // 0 = resting, 1 = talking; decays each frame
  const pointer = { x: useMotionValue(0), y: useMotionValue(0) }; // -1 to 1, relative to the orb
  const pulse = () => energy.set(Math.max(energy.get(), 0.4 + Math.random() * 0.5));

  const brief = turn?.brief ?? emptyBrief;
  const step = turn?.step ?? "greeting";
  const previous = phase.name === "asking" ? previousStep(step, brief) : null; // where the Back button leads
  const context = () => ({ seenWork: memo.current.seenWork, returning: memo.current.returning, count: memo.current.count, backs: memo.current.backs });

  // Her mood shows in her eyes. Smiles pass after a moment; other moods stay.
  const feel = (next: Mood, ms = 2400) => {
    setMood(next);
    clearTimeout(timers.current.mood);
    if (next === "happy" || next === "excited") timers.current.mood = setTimeout(() => setMood("calm"), ms);
  };
  // What goes with every new line of hers, once the machine has accepted it.
  const said = (next: Turn) => {
    memo.current.history.push({ who: "mira", text: next.reply });
    feel(next.mood);
  };
  // A short remark that doesn't interrupt the question on screen.
  const remark = (line: string) => {
    setAside(line);
    if (!isSpeaking()) void speak([line]);
    clearTimeout(timers.current.aside);
    timers.current.aside = setTimeout(() => setAside(null), (speechSeconds([line]) || 2.5) * 1000 + 1200);
  };

  // Find out early whether AI is set up.
  useEffect(() => {
    fetch("/api/mira", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ping: true }) })
      .then((res) => res.json())
      .then((data: { ai?: boolean }) => {
        setAiOn(!!data.ai);
      })
      .catch(() => {});
  }, []);

  // Start pressed on the welcome screen: Mira appears and greets.
  const start = () => {
    wakeAudio(); // this click is what lets the browser play her voice
    try {
      memo.current.seenWork = sessionStorage.getItem(SEEN_WORK) === "1";
      memo.current.returning = localStorage.getItem(MET) === "1";
    } catch {
      // Storage can be blocked; she just greets as if it's the first visit.
    }
    const greeting = scriptedTurn("greeting", emptyBrief, { kind: "start" }, context());
    if (!mira.send({ type: "START", turn: greeting })) return;
    said(greeting);
    preload([...lines.back, ...lines.pokes, lines.idle[0]]);
  };

  // ---------- What is on screen, and the lines that say it ----------
  const firstName = (brief.name ?? "").trim().split(/\s+/)[0];
  const [prompt, spoken]: [string, string[]] =
    status === "sending" ? [lines.sending, [lines.sending]]
    : status === "sent" ? [withName(lines.sent, firstName), [lines.sent]]
    : status === "drafted" ? [withName(lines.drafted, firstName), [lines.drafted]]
    : status === "failed" ? [lines.failed, [lines.failed]]
    : turn ? [turn.reply, turn.recorded ?? [turn.reply]]
    : ["", []];
  const lineId = `${turnId}-${status}`;

  // Type at the pace of the recording, so the words appear as she says them.
  const seconds = speechSeconds(spoken);
  const pace = seconds ? Math.max(20, Math.min(80, (seconds * 1000) / prompt.length)) : TYPE_MS;
  const { shown, done } = useTyping(seen && !thinking ? prompt : "", lineId, pace, reduce, () => {
    if (!isSpeaking()) pulse(); // with no sound, the letters make the orb pulse
  });

  // Say each new line aloud as soon as it appears. Coming back to this page
  // (Next keeps it alive, hidden) says the current line again.
  useEffect(() => {
    if (seen && prompt && !thinking) void speak(spoken, { aiWritten: !!turn?.aiWritten && status === "talking" });
    // `spoken` is rebuilt every render; lineId identifies the line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineId, seen, thinking]);
  // On a phone a long question can push the answers below the screen,
  // and a short one after it can leave the question under the header. Once
  // the answers have appeared, scroll the least needed to show both; if they
  // can't both fit, the start of the question wins.
  const answers = useRef<HTMLDivElement>(null);
  const showAnswers = done && !thinking && !!turn;
  useEffect(() => {
    if (!showAnswers || !window.matchMedia("(max-width: 767px)").matches) return;
    const timer = setTimeout(() => {
      const box = answers.current?.getBoundingClientRect();
      const question = answers.current?.previousElementSibling?.getBoundingClientRect();
      if (!box || !question || box.height === 0) return;
      const header = 72;
      const bottomGap = 24; // breathing room at the bottom edge
      const least = box.bottom - (window.innerHeight - bottomGap); // answers fully shown
      const most = question.top - header; // question still below the header
      const by = least > most ? most : Math.max(least, Math.min(0, most));
      if (Math.abs(by) > 4) window.scrollBy({ top: by, behavior: reduce ? "auto" : "smooth" });
    }, 420); // after the answers have animated in
    return () => clearTimeout(timer);
  }, [showAnswers, lineId, reduce]);

  useLayoutEffect(
    () => () => {
      stopSpeaking();
      clearTimeout(timers.current.mood);
      clearTimeout(timers.current.aside);
      clearTimeout(timers.current.idle);
      setAside(null);
    },
    [],
  );

  // Fetch the recordings each option would lead to, so they start without a pause.
  useEffect(() => {
    if (!turn || status !== "talking") return;
    preload(
      turn.options.flatMap((option) => {
        const field = fieldFor[turn.step];
        const next = field ? withAnswer(turn.brief, field, option) : turn.brief;
        return scriptedTurn(turn.step, next, { kind: "tap", text: option }, context()).recorded ?? [];
      }),
    );
    if (turn.step === "summary") preload([lines.sending, lines.sent, lines.drafted]);
    // And what she'd say if they press Back.
    if (previous) preload([lines.backTo[previous], lines.ask.greeting]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId]);

  // The orb moves with the loudness of her voice.
  useAnimationFrame(() => {
    const level = loudness();
    if (level > 0) energy.set(Math.max(energy.get(), level));
  });

  // She checks in after a long quiet spell (twice at most). Any click, tap or
  // key press in the section starts the wait again.
  const awake = () => {
    clearTimeout(timers.current.idle);
    timers.current.idle = setTimeout(() => {
      const m = memo.current;
      if (document.hidden || m.idles >= lines.idle.length) return;
      remark(lines.idle[m.idles++]);
    }, IDLE_MS);
  };
  useEffect(() => {
    if (!turn || status !== "talking" || thinking) return;
    const held = timers.current;
    awake();
    return () => clearTimeout(held.idle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId, status, thinking]);

  // If the cursor heads for the top of the window mid-conversation, she offers a quick way out (once).
  useEffect(() => {
    const leaving = (e: MouseEvent) => {
      const m = memo.current;
      if (e.clientY > 0 || m.warnedLeaving || status !== "talking" || !brief.service || brief.contact) return;
      m.warnedLeaving = true;
      awake();
      remark(lines.leaving);
    };
    document.documentElement.addEventListener("mouseleave", leaving);
    return () => document.documentElement.removeEventListener("mouseleave", leaving);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, brief.service, brief.contact]);

  // ---------- The conversation ----------
  // Ask the live AI for Mira's next line. Name and contact stay on this device.
  const askAI = async (at: Step, answers: Brief, said: Said): Promise<Turn | null> => {
    try {
      const { name, contact, ...rest } = answers;
      const res = await fetch("/api/mira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: at,
          brief: rest,
          hasName: !!name,
          hasContact: !!contact,
          said: { kind: said.kind, text: "text" in said ? said.text : "" },
          history: memo.current.history.slice(-12),
        }),
        signal: AbortSignal.timeout(AI_WAIT_MS),
      });
      const data = (await res.json()) as AiReply;
      if (!data.ai) throw new Error("AI unavailable");
      memo.current.aiFails = 0;
      return {
        reply: data.reply,
        // Spoken in parts: her recorded question plays at once in her own voice;
        // the AI's reaction before it is voiced only if her in-browser voice is quick enough.
        recorded: data.spoken?.length ? data.spoken : null,
        aiWritten: true,
        mood: data.mood,
        step: data.step,
        options: data.options,
        input: data.input,
        brief: { ...data.brief, name, contact },
      };
    } catch {
      // Two failures in a row: stop asking and stay with the written lines.
      if (++memo.current.aiFails >= 2) setAiOn(false);
      return null;
    }
  };

  /** The visitor did something at step `at`; `answers` already includes it. */
  const act = async (did: Said, answers: Brief, at: Step) => {
    const m = memo.current;
    // Only the question on screen can be answered, and only once: a second
    // click still carries the old turn's id, which the machine refuses.
    const now = mira.get();
    if (now.name !== "asking" || now.id !== turnId) return;
    stopSpeaking();
    clearTimeout(timers.current.aside);
    setAside(null);
    m.count++;
    if (did.kind === "tap" || did.kind === "text") m.history.push({ who: "visitor", text: did.text });
    try {
      localStorage.setItem(MET, "1");
    } catch {
      // not remembered; nothing else depends on it
    }

    let next: Turn | null = null;
    // The AI handles typed messages, where understanding free text matters. Taps
    // and forms get her written replies, which have recordings, so her own voice
    // plays instantly. (AI-written lines can't be recorded ahead of time.)
    if (aiOn && did.kind === "text" && at !== "summary" && mira.send({ type: "THINK", after: turnId })) {
      enableLiveVoice(); // her voice for the AI's words: downloaded only once someone types
      feel("thinking");
      next = await askAI(at, answers, did);
    }
    next ??= scriptedTurn(at, answers, did, context());
    if (mira.send({ type: "SAY", turn: next, after: turnId })) said(next);
  };

  const choose = (option: string) => {
    if (!turn) return;
    if (turn.step === "summary" && option === CONFIRM) return void send();
    const field = fieldFor[turn.step];
    void act({ kind: "tap", text: option }, field ? withAnswer(brief, field, option) : brief, turn.step);
  };
  // Go back to one question; the answers that depend on it are asked again too.
  const edit = (to: Step) => {
    void act({ kind: "back" }, withoutAnswer(brief, to), to);
    memo.current.backs++; // so her next remark is a different one
  };
  const goBack = () => {
    if (previous) edit(previous);
  };
  // The edit buttons carry their step in data-step, so one handler serves them all.
  const editClicked = (e: React.MouseEvent<HTMLButtonElement>) => edit(e.currentTarget.dataset.step as Step);
  // Clicking or tapping the orb: she smiles and says something short.
  const poke = () => {
    const m = memo.current;
    awake();
    energy.set(1);
    feel("happy", 1900);
    remark(lines.pokes[m.pokes++ % lines.pokes.length]);
  };

  // ---------- Sending the brief ----------
  const rows: [string, string | null, Step][] = [
    ["Need", brief.service, "service"],
    ["Type", brief.project_type, "project_type"],
    ["Stage", brief.stage, "stage"],
    ["Timeline", brief.timeline, "timeline"],
    ["Budget", brief.budget, "budget"],
    ["Details", brief.details || "Not given", "details"],
    ["Name", brief.name, "contact"],
    ["Contact", brief.contact, "contact"],
  ];
  const filled = rows.filter((row): row is [string, string, Step] => !!row[1]);
  const subject = `New project enquiry: ${[brief.service, brief.project_type].filter(Boolean).join(", ")}`;
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(filled.map(([label, value]) => `${label}: ${value}`).join("\n"))}`;

  // With a Formspree form ID in site.ts the brief is delivered straight to your
  // inbox. Without one, it opens the visitor's email app with everything filled in.
  const send = async () => {
    // The machine only accepts these from the summary (or, for SEND, after a failure).
    if (!mira.send({ type: site.formspree ? "SEND" : "DRAFTED" })) return;
    stopSpeaking();
    feel("excited");
    if (!site.formspree) {
      window.location.assign(mailto);
      return;
    }
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brief.contact ?? "");
      const res = await fetch(`https://formspree.io/f/${site.formspree}`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          _subject: subject,
          ...Object.fromEntries(filled.map(([label, value]) => [label.toLowerCase(), value])),
          ...(isEmail ? { email: brief.contact } : {}), // lets you reply straight from your inbox
        }),
      });
      mira.send({ type: res.ok ? "DELIVERED" : "FAILED" });
    } catch {
      mira.send({ type: "FAILED" });
    }
  };
  const copyBrief = () => {
    void navigator.clipboard
      ?.writeText([subject, "", ...filled.map(([label, value]) => `${label}: ${value}`)].join("\n"))
      .then(() => setCopied(true));
  };
  const restart = () => {
    const greeting = scriptedTurn("greeting", emptyBrief, { kind: "start" }, context());
    if (!mira.send({ type: "RESTART", turn: greeting })) return;
    Object.assign(memo.current, { history: [], idles: 0, backs: 0, warnedLeaving: false });
    setDetails("");
    setPerson({ name: "", contact: "" });
    setCopied(false);
    said(greeting);
  };

  const finished = status !== "talking";
  const typing = turn?.input !== "options" || step === "summary"; // a form or the summary is showing
  const pill = "glass rounded-full border px-4 py-2.5 md:px-5 md:py-3 text-sm text-cream/85 transition-colors duration-300 hover:border-gold/60 hover:text-gold md:text-base";
  const field =
    "w-full rounded-2xl border border-cream/12 bg-ink/40 px-4 py-3 text-sm outline-none transition-colors placeholder:text-cream/35 focus:border-gold md:text-base";
  const label = "mb-1.5 block font-accent text-[13px] text-cream/65";
  const back = "text-sm text-cream/70 md:text-cream/55 transition-colors hover:text-gold";

  return (
    <section
      ref={root}
      aria-labelledby="assistant-title"
      // For tests and debugging: where the conversation is, and whether Mira has
      // finished her line and the visitor can answer.
      data-phase={phase.name}
      data-step={started ? step : undefined}
      data-ready={started ? done && !thinking : undefined}
      className="relative flex min-h-[calc(100svh-9rem)] flex-col items-center pb-8 text-center"
      onPointerDown={awake}
      onKeyDown={awake}
      onPointerMove={(e) => {
        const orb = root.current?.querySelector("[data-orb]")?.getBoundingClientRect();
        if (!orb) return;
        // -1 to 1 by the time the cursor is about a third of the screen away.
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        pointer.x.set(clamp((e.clientX - (orb.left + orb.width / 2)) / (window.innerWidth * 0.3)));
        pointer.y.set(clamp((e.clientY - (orb.top + orb.height / 2)) / (window.innerHeight * 0.3)));
      }}
      onPointerLeave={() => {
        pointer.x.set(0);
        pointer.y.set(0);
      }}
    >
      {!started ? (
        <Welcome onStart={start} />
      ) : (
      <>
      <h2 id="assistant-title" className="sr-only">Start a project with Mira</h2>

      {/* Step count */}
      <p className="w-full text-left font-accent text-xs text-cream/70 md:text-cream/50 md:text-xs">
        {status === "sent" || status === "drafted" ? (
          <span className="text-gold">Done</span>
        ) : (
          <>
            <span className="text-gold">{String(steps.indexOf(step) + 1).padStart(2, "0")}</span> / {String(steps.length - 1).padStart(2, "0")}
          </>
        )}
      </p>

      {/* She grows out of the little light on the welcome screen */}
      <motion.div initial={reduce ? false : { scale: 0.08, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 14 }}>
        <MiraOrb energy={energy} pointer={pointer} busy={!done || thinking} pulseKey={seen && turn ? lineId : ""} reduce={reduce} compact={typing && !finished} mood={mood} aside={aside} onPoke={poke} />
      </motion.div>

      {/* Answers so far; tap one to change it */}
      <div className="flex min-h-9 max-w-3xl flex-wrap justify-center gap-2">
        {!finished && !thinking && step !== "summary" &&
          filled.filter(([, , at]) => at !== step && at !== "details" && at !== "contact").map(([name, value, at]) => (
            <button
              key={name}
              type="button"
              data-step={at}
              onClick={editClicked}
              aria-label={`Change ${name.toLowerCase()}: ${value}`}
              className="rounded-full border border-cream/15 px-3 py-1.5 text-xs text-cream/60 transition-colors hover:border-gold hover:text-gold"
            >
              {value} <span aria-hidden>✎</span>
            </button>
          ))}
      </div>

      {/* What she says. Screen readers get it whole; the typing is visual only. */}
      <p className="sr-only" aria-live="polite">{!seen ? "" : thinking ? "One moment…" : prompt}</p>
      <p aria-hidden className="mt-3 flex min-h-[2.8em] max-w-3xl items-start justify-center font-display text-[1.375rem] leading-snug sm:text-2xl md:mt-4 md:text-4xl">
        {thinking ? (
          <span className="mt-3 flex gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2.5 w-2.5 animate-bounce rounded-full bg-gold [animation-duration:0.9s]" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        ) : (
          <span>
            {shown}
            {!done && seen && <span className="ml-1 inline-block h-[0.85em] w-0.75 translate-y-[0.1em] animate-pulse bg-gold" />}
          </span>
        )}
      </p>

      {/* How the visitor answers */}
      <div ref={answers} className="mt-4 w-full max-w-3xl md:mt-5">
        <AnimatePresence mode="wait">
          {done && !thinking && turn && (
            <motion.div
              key={lineId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              {/* The summary to check before sending */}
              {status === "talking" && step === "summary" && (
                <dl className="glass mb-5 w-full max-w-xl rounded-[1.75rem] px-5 py-2 text-left md:px-6">
                  {filled.map(([name, value, at]) => (
                    <div key={name} className="flex items-start justify-between gap-4 border-b border-cream/10 py-2.5 last:border-0">
                      <dt className="w-20 shrink-0 pt-0.5 font-accent text-[13px] text-cream/65">{name}</dt>
                      <dd className="min-w-0 flex-1 break-words text-sm text-cream md:text-base">{value}</dd>
                      <button type="button" data-step={at} onClick={editClicked} aria-label={`Change ${name.toLowerCase()}`} className="shrink-0 text-sm text-cream/70 md:text-cream/45 hover:text-gold">✎</button>
                    </div>
                  ))}
                </dl>
              )}

              {status === "talking" && turn.options.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 md:gap-2.5">
                  {turn.options.map((option, i) => (
                    <motion.button
                      key={option}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.05 }}
                      onClick={() => choose(option)}
                      className={option === CONFIRM ? "btn-gloss rounded-full px-7 py-3 font-accent text-xs" : pill}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* With AI on, visitors can also just type */}
              {status === "talking" && aiOn && turn.input === "options" && step !== "summary" && (
                <form
                  className="mt-5 w-full max-w-md"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = draft.trim();
                    if (!text) return;
                    setDraft("");
                    void act({ kind: "text", text }, brief, step);
                  }}
                >
                  <div className="glass flex items-center gap-2 rounded-full p-1.5 pl-5">
                    <label htmlFor="mira-type" className="sr-only">Or type your answer</label>
                    <input id="mira-type" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={300} autoComplete="off" placeholder="Or type your answer…" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-cream/40" />
                    <button type="submit" aria-label="Send" className="btn-gloss grid h-9 w-9 shrink-0 place-items-center rounded-full">↑</button>
                  </div>
                  <p className="mt-2 text-xs text-cream/55">Typed messages are read by Google&apos;s Gemini AI. Please don&apos;t include private details.</p>
                </form>
              )}

              {/* A sentence or two about the idea (optional) */}
              {status === "talking" && turn.input === "text" && (
                <form
                  className="glass w-full max-w-xl rounded-[1.75rem] p-5 text-left md:p-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act({ kind: "form" }, { ...brief, details: details.trim() }, "details");
                  }}
                >
                  <label className="block">
                    <span className={label}>Your idea (optional)</span>
                    <textarea rows={3} maxLength={600} value={details} onChange={(e) => setDetails(e.target.value)} className={`${field} resize-none`} placeholder="What is it for, who will use it, anything you already have…" />
                  </label>
                  {aiOn && <p className="mt-2 text-xs text-cream/55">This is read by Google&apos;s Gemini AI to word Mira&apos;s reply.</p>}
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <button type="button" onClick={goBack} className={back}>← Back</button>
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => void act({ kind: "form" }, { ...brief, details: "" }, "details")} className="text-sm text-cream/60 hover:text-gold">Skip</button>
                      <button type="submit" className="btn-gloss rounded-full px-7 py-3 font-accent text-xs">Continue</button>
                    </div>
                  </div>
                </form>
              )}

              {/* Name and where to reach them. These never go to the AI. */}
              {status === "talking" && turn.input === "email_or_phone" && (
                <form
                  className="glass w-full max-w-xl rounded-[1.75rem] p-5 text-left md:p-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act({ kind: "form" }, { ...brief, name: person.name.trim(), contact: person.contact.trim() }, "contact");
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className={label}>Your name</span>
                      <input required autoComplete="name" maxLength={80} value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} className={field} placeholder="Jane Tan" />
                    </label>
                    <label className="block">
                      <span className={label}>Email or WhatsApp</span>
                      <input
                        required
                        maxLength={120}
                        value={person.contact}
                        onChange={(e) => {
                          const value = e.target.value.trim();
                          const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /^\+?[\d\s-]{8,}$/.test(value);
                          e.target.setCustomValidity(ok ? "" : "Enter an email address or a WhatsApp number");
                          setPerson({ ...person, contact: e.target.value });
                        }}
                        className={field}
                        placeholder="you@email.com or 012-345 6789"
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <button type="button" onClick={goBack} className={back}>← Back</button>
                    <button type="submit" className="btn-gloss rounded-full px-7 py-3 font-accent text-xs">Continue</button>
                  </div>
                </form>
              )}

              {/* Back to the previous question (the two forms have their own Back button) */}
              {previous && turn.input === "options" && (
                <button type="button" onClick={goBack} className={`mt-6 ${back}`}>← Back</button>
              )}

              {status === "drafted" && (
                <p className="mb-4 max-w-md text-sm text-cream/60">
                  Email app didn&apos;t open?{" "}
                  <button type="button" onClick={copyBrief} className="text-gold underline-offset-4 hover:underline">
                    {copied ? "Copied!" : "Copy the details"}
                  </button>{" "}
                  and send them to <a href={`mailto:${site.email}`} className="text-cream hover:text-gold">{site.email}</a>.
                </p>
              )}
              {(status === "sent" || status === "drafted") && (
                <button type="button" onClick={restart} className="rounded-full border border-cream/20 px-5 py-2.5 text-sm text-cream/80 transition-colors hover:border-gold hover:text-gold">
                  Start another project
                </button>
              )}
              {status === "failed" && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => void send()} className="btn-gloss rounded-full px-6 py-3 font-accent text-xs">Try again</button>
                  <a href={mailto} className="rounded-full border border-cream/20 px-5 py-3 text-sm text-cream/80 hover:border-gold hover:text-gold">Email instead</a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </>
      )}
    </section>
  );
}

// The first thing visitors see: a small light, an invitation, and a Start
// button. Mira appears (and starts talking) when it's pressed. Pressing it also
// counts as the click browsers need before a page may play sound.
function Welcome({ onStart }: { onStart: () => void }) {
  const ease = [0.22, 1, 0.36, 1] as const;
  const links = [
    { label: "LinkedIn", href: site.links.linkedin },
    { label: "GitHub", href: site.links.github },
  ].filter((l) => l.href);
  return (
    <motion.div exit={{ opacity: 0 }} className="flex w-full flex-1 flex-col items-center">
      <div className="flex flex-1 flex-col items-center justify-center py-10">
        {/* The light Mira grows from */}
        <motion.span
          aria-hidden
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease }}
          className="relative mb-10 grid h-4 w-4 place-items-center"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-gold/50 [animation-duration:2.4s]" />
          <span className="h-3 w-3 rounded-full bg-gold shadow-[0_0_18px_4px_rgb(224_202_60/0.55)]" />
        </motion.span>

        <motion.h2
          id="assistant-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease }}
          className="max-w-3xl font-display text-4xl leading-[1.05] md:text-7xl"
        >
          Have an idea in mind?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease }}
          className="mt-5 max-w-md text-base text-cream/65 md:text-lg"
        >
          Mira will help you shape it into a quick project brief. It takes about two minutes.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.65, ease }} className="mt-9 flex flex-col items-center">
          <button type="button" onClick={onStart} className="btn-gloss rounded-full px-9 py-4 font-accent text-xs md:text-sm">
            Start the conversation
          </button>
          <p className="mt-4 text-xs text-cream/70 md:text-cream/40">Mira talks, so turn your sound on.</p>
        </motion.div>
      </div>

      {/* For visitors who'd rather not chat */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="grid w-full grid-cols-[1fr_auto_1fr] items-end gap-4 font-accent text-[13px]"
      >
        <a href={links[0]?.href} target="_blank" rel="noreferrer" className={`justify-self-start py-3 text-cream/70 md:text-cream/50 hover:text-gold ${links[0] ? "" : "invisible"}`}>
          {links[0]?.label}
        </a>
        <p className="text-center">
          <span className="block normal-case tracking-normal text-cream/70 md:text-cream/40">Not a fan of chats?</span>
          <a href={`mailto:${site.email}`} className="inline-block py-3 text-cream/80 hover:text-gold">{site.email}</a>
        </p>
        <a href={links[1]?.href} target="_blank" rel="noreferrer" className={`justify-self-end py-3 text-cream/70 md:text-cream/50 hover:text-gold ${links[1] ? "" : "invisible"}`}>
          {links[1]?.label}
        </a>
      </motion.div>
    </motion.div>
  );
}

// Puts the visitor's name into the first exclamation of a line, whatever its
// wording: "All set! Your…" becomes "All set, Jane! Your…". (On screen only;
// the recording can't know their name.)
function withName(line: string, name: string) {
  return name && /^[^.?!]*!/.test(line) ? line.replace("!", `, ${name}!`) : line;
}

// Types `text` out letter by letter after a short pause, calling onLetter for
// each letter so the orb can pulse. Starts again whenever `id` changes.
function useTyping(text: string, id: string, ms: number, instant: boolean, onLetter: () => void) {
  const [progress, setProgress] = useState({ id: "", n: 0 });
  const letter = useRef(onLetter);
  useEffect(() => {
    letter.current = onLetter;
  });
  useEffect(() => {
    if (!text) return;
    let i = 0;
    let tick: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      if (instant) return setProgress({ id, n: text.length });
      tick = setInterval(() => {
        i++;
        if (/[a-z]/i.test(text[i - 1] ?? "")) letter.current();
        setProgress({ id, n: i });
        if (i >= text.length) clearInterval(tick);
      }, ms);
    }, instant ? 0 : 380);
    return () => {
      clearTimeout(start);
      clearInterval(tick);
    };
  }, [text, id, ms, instant]);
  const n = text && progress.id === id ? progress.n : 0;
  return { shown: text.slice(0, n), done: !!text && n >= text.length };
}
