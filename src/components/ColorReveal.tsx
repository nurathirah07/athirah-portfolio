"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";

const TRAIL_MS = 1300; // how long a brushed area stays in colour

type Stamp = { x: number; y: number; born: number };

// A soft round brush, drawn once and reused for every stamp.
function makeBrush() {
  const size = 256;
  const brush = document.createElement("canvas");
  brush.width = brush.height = size;
  const ctx = brush.getContext("2d")!;
  const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.55, "rgba(255,255,255,0.9)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  return brush;
}

// Shows a photo in black and white. Only the area under the cursor, plus a
// short fading trail behind it, is painted back in full colour.
export default function ColorReveal({
  src,
  width,
  height,
  alt,
  className,
  style,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const brush = makeBrush();
    // The photo as a ready-to-draw bitmap, decoded in the background. Drawing
    // the plain <img> made the first touch decode it on the spot, which froze
    // phones for about half a second.
    let bitmap: ImageBitmap | null = null;
    let gone = false;
    const photo = new window.Image();
    photo.src = src;
    photo
      .decode()
      .then(() => createImageBitmap(photo))
      .then((b) => {
        if (gone) b.close();
        else bitmap = b;
      })
      .catch(() => {});

    let stamps: Stamp[] = [];
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let w = 0;
    let h = 0;
    let radius = 100;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      // Phones draw at a slightly lower resolution: the colour is a soft brush anyway.
      const dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia("(max-width: 767px)").matches ? 1.5 : 2);
      w = rect.width;
      h = rect.height;
      radius = Math.max(45, Math.min(150, w * 0.24));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      stamps = stamps.filter((s) => now - s.born < TRAIL_MS);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);

      if (bitmap) {
        for (const s of stamps) {
          ctx.globalAlpha = 1 - (now - s.born) / TRAIL_MS;
          ctx.drawImage(brush, s.x - radius, s.y - radius, radius * 2, radius * 2);
        }
        if (pointer) {
          ctx.globalAlpha = 1;
          ctx.drawImage(brush, pointer.x - radius, pointer.y - radius, radius * 2, radius * 2);
        }
        // Keep the photo only where the brush has painted.
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-in";
        ctx.drawImage(bitmap, 0, 0, w, h);
      }

      // Stop the loop once nothing is left to fade.
      raf = stamps.length || pointer ? requestAnimationFrame(draw) : 0;
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const toLocal = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    // Lay stamps along the path so fast cursor moves stay continuous.
    const move = (e: PointerEvent) => {
      const next = toLocal(e);
      const now = performance.now();
      if (pointer) {
        const dist = Math.hypot(next.x - pointer.x, next.y - pointer.y);
        const steps = Math.min(24, Math.floor(dist / (radius * 0.3)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          stamps.push({
            x: pointer.x + (next.x - pointer.x) * t,
            y: pointer.y + (next.y - pointer.y) * t,
            born: now,
          });
        }
        if (stamps.length > 500) stamps = stamps.slice(-500);
      }
      pointer = next;
      wake();
    };

    const leave = () => {
      if (pointer) stamps.push({ ...pointer, born: performance.now() });
      pointer = null;
      wake();
    };

    // The browser cancels the touch when the finger starts scrolling the page:
    // that was a scroll, not painting, so drop the trail at once instead of
    // letting it fade (which repaints the whole photo every frame).
    const scrolled = () => {
      stamps = [];
      pointer = null;
      wake();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    wrap.addEventListener("pointerdown", move);
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerleave", leave);
    wrap.addEventListener("pointercancel", scrolled);

    return () => {
      gone = true;
      bitmap?.close();
      cancelAnimationFrame(raf);
      raf = 0;
      observer.disconnect();
      wrap.removeEventListener("pointerdown", move);
      wrap.removeEventListener("pointermove", move);
      wrap.removeEventListener("pointerleave", leave);
      wrap.removeEventListener("pointercancel", scrolled);
    };
  }, [src]);

  return (
    <div
      ref={wrapRef}
      data-cursor="reveal"
      className={`relative touch-pan-y select-none ${className ?? ""}`}
      style={{ aspectRatio: `${width} / ${height}`, ...style }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        unoptimized
        draggable={false}
        className="object-contain grayscale"
      />
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}
