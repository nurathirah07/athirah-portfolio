"use client";
import { useEffect, useRef } from "react";
import { createMachine, type Transitions } from "@/lib/machine";

// The background's phases (shown on its wrapper as data-state):
//
//   paused ──RUN──▶ running ──PAUSE──▶ paused        (any) ──STILL──▶ still
//
// - running: the video plays and the shader draws every frame.
// - paused:  the hero is off screen or the tab is hidden: nothing plays or draws.
// - still:   reduced motion, or no WebGL: a dimmed still image instead, for good.
type Scene = { name: "paused" } | { name: "running" } | { name: "still" };
type SceneEvent = { type: "RUN" } | { type: "PAUSE" } | { type: "STILL" };
const still = (): Scene => ({ name: "still" });
const scenes: Transitions<Scene, SceneEvent> = {
  paused: { RUN: () => ({ name: "running" }), STILL: still },
  running: { PAUSE: () => ({ name: "paused" }), STILL: still },
  still: {},
};

const VIDEO = "/animations/scene-bg.mp4";
const POSTER = "/animations/scene-bg.jpg";
const MAX_RIPPLES = 8;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Samples the video with "cover" sizing, drifts it toward the cursor, bends it
// with expanding ripples, pulls its colours toward the site palette, and lights
// it with a soft spotlight that follows the cursor.
const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec2 uVid;
uniform vec2 uMouse;
uniform float uTime;
uniform vec4 uRipples[${MAX_RIPPLES}];

const vec3 INK = vec3(0.0, 0.059, 0.031);
const vec3 SPRUCE = vec3(0.075, 0.435, 0.388);
const vec3 AMETHYST = vec3(0.243, 0.184, 0.357);
const vec3 GOLD = vec3(0.878, 0.792, 0.235);

void main() {
  vec2 screen = vec2(vUv.x, 1.0 - vUv.y);
  float aspect = uRes.x / uRes.y;
  vec2 p = screen * vec2(aspect, 1.0);
  vec2 m = uMouse * vec2(aspect, 1.0);

  vec2 offset = vec2(0.0);
  float shine = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 2.4) continue;
    vec2 d = p - r.xy * vec2(aspect, 1.0);
    float dist = length(d);
    float radius = age * 0.42;
    float ring = exp(-pow((dist - radius) * 11.0, 2.0)) * exp(-age * 1.5) * r.w;
    offset += normalize(d + 1e-5) * sin((dist - radius) * 55.0) * ring * 0.014;
    shine += ring;
  }

  // Cover-fit the video, slightly zoomed so drift never shows an edge.
  float sa = aspect / (uVid.x / uVid.y);
  vec2 scale = sa > 1.0 ? vec2(1.0, 1.0 / sa) : vec2(sa, 1.0);
  vec2 uv = (screen - 0.5) * scale * 0.86 + 0.5;
  uv += (uMouse - 0.5) * 0.05 + offset;
  vec3 c = texture2D(uTex, clamp(uv, 0.002, 0.998)).rgb;

  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 tint = mix(AMETHYST, SPRUCE, smoothstep(0.25, 0.75, lum));
  tint = mix(tint, GOLD, smoothstep(0.82, 1.0, lum) * 0.5);
  c = mix(c, tint, 0.55);

  float spot = exp(-dot(p - m, p - m) / 0.16);
  c *= 0.16 + 0.42 * spot;
  c += GOLD * shine * 0.05;

  // Melt into the page at the top and bottom of the hero.
  float edge = smoothstep(0.0, 0.18, screen.y) * smoothstep(1.0, 0.62, screen.y);
  gl_FragColor = vec4(mix(INK, c, edge), 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

// Animated gradient behind the home hero. It sits under the portrait, so the
// photo itself is never distorted or tinted.
export default function SceneBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const canvas = canvasRef.current!;
    const video = videoRef.current!;
    // The phase changes many times a second at most, never needs a re-render:
    // it only goes on the wrapper, for tests and debugging.
    const scene = createMachine<Scene, SceneEvent>({ name: "paused" }, scenes);
    const showPhase = () => (root.dataset.state = scene.get().name);
    const stopShowing = scene.subscribe(showPhase);
    showPhase();
    // Static, dimmed still image when motion is off or WebGL is missing.
    const setFallback = () => {
      scene.send({ type: "STILL" });
      canvas.hidden = true;
      posterRef.current!.hidden = false;
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFallback();
      return stopShowing;
    }
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) {
      setFallback();
      return stopShowing;
    }

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      setFallback();
      return stopShowing;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 15, 8]));

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("uRes"), uVid = u("uVid"), uMouse = u("uMouse"), uTime = u("uTime"), uRipples = u("uRipples[0]");

    const ripples = new Float32Array(MAX_RIPPLES * 4);
    let nextRipple = 0;
    const addRipple = (x: number, y: number, strength: number) => {
      ripples.set([x, y, performance.now() / 1000, strength], nextRipple * 4);
      nextRipple = (nextRipple + 1) % MAX_RIPPLES;
    };

    // Phones get a lighter version: lower resolution, half the frame rate.
    const phone = window.matchMedia("(max-width: 767px)").matches;

    // The background is soft, so it renders at reduced resolution.
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 1) * (phone ? 0.4 : 0.6);
      canvas.width = Math.max(1, Math.round(r.width * scale));
      canvas.height = Math.max(1, Math.round(r.height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);

    const target = { x: 0.5, y: 0.45 };
    const mouse = { x: 0.5, y: 0.45 };
    let lastPointer = 0;
    let lastRipple = { x: -1, y: -1 };

    const toLocal = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
    };
    const move = (e: PointerEvent) => {
      const pt = toLocal(e);
      if (!pt) return;
      target.x = pt.x;
      target.y = pt.y;
      lastPointer = performance.now();
      if (Math.hypot(pt.x - lastRipple.x, pt.y - lastRipple.y) > 0.12) {
        addRipple(pt.x, pt.y, 0.45);
        lastRipple = pt;
      }
    };
    const down = (e: PointerEvent) => {
      const pt = toLocal(e);
      if (pt) addRipple(pt.x, pt.y, 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });

    // Copy the video to the GPU only when it has a new frame (30 a second, 15 on phones),
    // not on every screen refresh. Browsers without requestVideoFrameCallback
    // copy every time, as before.
    let fresh = true;
    let watching = 0;
    const watchFrames = "requestVideoFrameCallback" in video;
    // Phones take every other video frame (15 a second): the background moves
    // slowly, so it looks the same, and it halves the copying.
    let frameCount = 0;
    const onVideoFrame = () => {
      frameCount++;
      if (!phone || frameCount % 2 === 0) fresh = true;
      watching = video.requestVideoFrameCallback(onVideoFrame);
    };
    if (watchFrames) watching = video.requestVideoFrameCallback(onVideoFrame);

    let raf = 0;
    let visible = true;
    let lastDraw = 0;
    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return pause();
      if (phone && now - lastDraw < 30) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastDraw = now;
      const t = now / 1000;
      // Without a pointer (phones, or an idle mouse) the light drifts on its own.
      if (now - lastPointer > 4000) {
        target.x = 0.5 + Math.sin(t * 0.23) * 0.28;
        target.y = 0.42 + Math.cos(t * 0.31) * 0.18;
      }
      mouse.x += (target.x - mouse.x) * 0.06;
      mouse.y += (target.y - mouse.y) * 0.06;

      if (video.readyState >= 2) {
        if (fresh) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        if (watchFrames) fresh = false;
        gl.uniform2f(uVid, video.videoWidth, video.videoHeight);
      } else {
        gl.uniform2f(uVid, 16, 9);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uTime, t);
      gl.uniform4fv(uRipples, ripples);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };
    // Only a paused scene starts, so the drawing loop can never run twice.
    const start = () => {
      if (visible && !document.hidden && scene.send({ type: "RUN" })) {
        video.play().catch(() => {});
        raf = requestAnimationFrame(frame);
      }
    };
    const pause = () => {
      if (!scene.send({ type: "PAUSE" })) return;
      cancelAnimationFrame(raf);
      raf = 0;
      video.pause();
    };

    // Pause the video and the drawing whenever the hero is off screen.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else pause();
    });
    io.observe(canvas);
    const onVisibility = () => (document.hidden ? pause() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      pause();
      video.pause();
      stopShowing();
      if (watchFrames) video.cancelVideoFrameCallback(watching);
      io.disconnect();
      resizer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* Source for the shader; it is never shown directly */}
      <video
        ref={videoRef}
        src={VIDEO}
        muted
        loop
        playsInline
        preload="auto"
        className="absolute h-px w-px opacity-0"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={posterRef} hidden src={POSTER} alt="" className="fade-bottom absolute inset-0 h-full w-full object-cover opacity-25 saturate-50" />
    </div>
  );
}
