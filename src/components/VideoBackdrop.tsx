"use client";
import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Reel, Shot } from "@/data/site";
import type { Transitions } from "@/lib/machine";
import { useMachine } from "@/lib/useMachine";
import { usePhone } from "@/lib/usePhone";
import { usePrefersStill } from "@/lib/usePrefersStill";

// A video's phases (shown on the element as data-state):
//
//   idle ──LOAD──▶ loading ──READY──▶ paused ⇄ playing
//                     └──────────FAIL (any time)──────▶ failed
//
// - idle:    only the poster; nothing downloaded yet.
// - loading: it came near the screen, so the file is being fetched.
// - paused / playing: follow the browser's own play and pause events.
// - failed:  the file couldn't play; the poster stays.
type Phase = { name: "idle" } | { name: "loading" } | { name: "paused" } | { name: "playing" } | { name: "failed" };
type VideoEvent = { type: "LOAD" } | { type: "READY" } | { type: "PLAY" } | { type: "PAUSE" } | { type: "FAIL" };
const fail = (): Phase => ({ name: "failed" });
const phases: Transitions<Phase, VideoEvent> = {
  idle: { LOAD: () => ({ name: "loading" }) },
  loading: { READY: () => ({ name: "paused" }), PLAY: () => ({ name: "playing" }), FAIL: fail },
  paused: { PLAY: () => ({ name: "playing" }), FAIL: fail },
  playing: { PAUSE: () => ({ name: "paused" }), FAIL: fail },
  failed: {},
};

// At most two videos play at once across the page (one on phones); starting
// another pauses the one that has been playing longest. On phones the Work
// cards stack over each other, and a covered card still counts as on screen,
// so with two allowed one would always be decoding out of sight.
const maxPlaying = () => (window.matchMedia("(max-width: 767px)").matches ? 1 : 2);
const playing: HTMLVideoElement[] = [];
function startedPlaying(video: HTMLVideoElement) {
  const i = playing.indexOf(video);
  if (i >= 0) playing.splice(i, 1);
  playing.push(video);
  const max = maxPlaying();
  while (playing.length > max) playing.shift()?.pause();
}
function stoppedPlaying(video: HTMLVideoElement) {
  const i = playing.indexOf(video);
  if (i >= 0) playing.splice(i, 1);
}

// Data Saver (on browsers that report it) means: show posters only.
const noWatch = () => () => {};
const saveData = () => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

/**
 * A project's reel, filling its parent, with the readability layers on top.
 * - mode "auto": plays while at least 40% of it is on screen.
 * - mode "hover": the poster at rest; plays while the pointer is over the card
 *   it sits in (or something in it has keyboard focus). On phones, plays while it is in the
 *   middle of the screen instead.
 * It downloads the file only once it is within a screen's height of view, and
 * shows only the poster (or the fallback screenshot) for reduced motion, Data
 * Saver, or a project without a video.
 */
export default function VideoBackdrop({
  video,
  fallback,
  mode = "auto",
  dim = 0.45,
  dots = false,
  vignette = true,
  className = "",
  sizes = "100vw",
}: {
  video?: Reel;
  fallback?: Shot;
  mode?: "auto" | "hover";
  dim?: number;
  dots?: boolean;
  vignette?: boolean;
  className?: string;
  sizes?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLVideoElement>(null);
  const reduce = usePrefersStill(); // decides video or still image, so it must match the server at first
  const phone = usePhone();
  const saving = useSyncExternalStore(noWatch, saveData, () => false);
  const stillOnly = !video || !!reduce || saving;
  const [phase, machine] = useMachine<Phase, VideoEvent>({ name: "idle" }, phases);
  const loaded = phase.name !== "idle";
  // Whether it should be playing right now (seen / hovered, tab visible).
  const wants = useRef({ seen: false, hovered: false });

  // Load when near the screen; then play and pause as it is seen or not.
  useEffect(() => {
    const host = box.current;
    const v = el.current;
    if (stillOnly || !host || !v) return;
    const hoverMode = mode === "hover" && !phone;

    const update = () => {
      const want = (hoverMode ? wants.current.hovered : wants.current.seen) && !document.hidden;
      if (want && v.paused && machine.get().name !== "idle" && machine.get().name !== "failed") void v.play().catch(() => {});
      if (!want && !v.paused) v.pause();
    };

    const near = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) machine.send({ type: "LOAD" });
    }, { rootMargin: "100% 0px" });
    // Phones in hover mode play while the card is in the middle 60% of the screen.
    const seen = new IntersectionObserver(
      ([e]) => {
        wants.current.seen = e.isIntersecting;
        update();
      },
      mode === "hover" ? { rootMargin: "-20% 0px -20% 0px" } : { threshold: 0.4 },
    );
    near.observe(host);
    seen.observe(host);

    // Hover is read from the card it sits in (the nearest `group`), since a
    // card's full-size link usually covers the video itself.
    const parent = host.closest<HTMLElement>(".group") ?? host.parentElement;
    const enter = (e: Event) => {
      if (e instanceof PointerEvent && e.pointerType !== "mouse") return;
      wants.current.hovered = true;
      update();
    };
    const leave = (e: Event) => {
      if (e instanceof FocusEvent && parent?.contains(e.relatedTarget as Node)) return;
      wants.current.hovered = false;
      update();
    };
    if (hoverMode && parent) {
      parent.addEventListener("pointerenter", enter);
      parent.addEventListener("pointerleave", leave);
      parent.addEventListener("focusin", enter);
      parent.addEventListener("focusout", leave);
    }

    const ready = () => {
      machine.send({ type: "READY" });
      update();
    };
    const onPlay = () => {
      startedPlaying(v);
      machine.send({ type: "PLAY" });
    };
    const onPause = () => {
      stoppedPlaying(v);
      machine.send({ type: "PAUSE" });
    };
    const onFail = () => {
      stoppedPlaying(v);
      machine.send({ type: "FAIL" });
    };
    v.addEventListener("loadeddata", ready);
    v.addEventListener("playing", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("error", onFail);
    document.addEventListener("visibilitychange", update);

    return () => {
      near.disconnect();
      seen.disconnect();
      if (hoverMode && parent) {
        parent.removeEventListener("pointerenter", enter);
        parent.removeEventListener("pointerleave", leave);
        parent.removeEventListener("focusin", enter);
        parent.removeEventListener("focusout", leave);
      }
      v.removeEventListener("loadeddata", ready);
      v.removeEventListener("playing", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onFail);
      document.removeEventListener("visibilitychange", update);
      v.pause();
      stoppedPlaying(v);
    };
  }, [stillOnly, mode, phone, machine]);

  // Once its sources are on the page, fetch the file (and play if it is wanted).
  useEffect(() => {
    if (loaded) el.current?.load();
  }, [loaded]);

  const still = video?.poster ?? fallback?.src;
  const hoverPoster = mode === "hover" && phase.name !== "playing";

  return (
    <div ref={box} aria-hidden data-state={stillOnly ? "still" : phase.name} className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {stillOnly ? (
        still && <Image src={still} alt="" fill sizes={sizes} className="object-cover object-top" />
      ) : (
        <>
          <video ref={el} muted loop playsInline preload="none" poster={video.poster} className="absolute inset-0 h-full w-full object-cover object-top">
            {/* Nothing is fetched until it comes near the screen */}
            {loaded && video.webm && <source src={video.webm} type="video/webm" />}
            {loaded && <source src={video.mp4} type="video/mp4" />}
          </video>
          {/* In hover mode the poster sits on top and fades away once it plays */}
          {mode === "hover" && (
            <Image
              src={video.poster}
              alt=""
              fill
              sizes={sizes}
              className={`object-cover object-top transition-opacity duration-150 ${hoverPoster ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </>
      )}

      {/* Readability: dimmed, darker at the edges, optionally a fine dot texture */}
      {dim > 0 && <div className="absolute inset-0 bg-ink" style={{ opacity: dim }} />}
      {vignette && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgb(0_15_8/0.8))]" />}
      {dots && <div className="absolute inset-0 bg-[radial-gradient(rgb(243_239_221/0.5)_1px,transparent_1.5px)] bg-size-[22px_22px] opacity-35" />}
    </div>
  );
}
