"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { usePhone } from "@/lib/usePhone";

type Source = { kind: "text"; text: string } | { kind: "image"; src: string };

/**
 * Draws its parent's content as thousands of fine dots: a line of text (in
 * extra-bold, filling the parent) or a photo (denser dots where it's lighter,
 * like a halftone). The dots shy away from the pointer and drift back.
 * It fills its parent, which must be positioned and sized. The parent can move
 * (a marquee, a parallax layer): the pointer is read in page coordinates.
 * Only redraws while dots are moving, so a still page costs nothing.
 */
export default function Dotted({ source, gap = 4, dot = 2, color = "rgb(243 239 221)", radius = 85 }: { source: Source; gap?: number; dot?: number; color?: string; radius?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const phone = usePhone();
  const key = source.kind === "text" ? source.text : source.src;

  useEffect(() => {
    const c = canvas.current;
    const host = c?.parentElement;
    if (!c || !host) return;
    const ctx = c.getContext("2d")!;
    // Each dot: its home position and how far it has been pushed from it.
    let hx = new Float32Array(0);
    let hy = new Float32Array(0);
    let dx = new Float32Array(0);
    let dy = new Float32Array(0);
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    let moving = true; // draw at least once
    const pointer = { x: -1e4, y: -1e4 };
    const cap = phone ? 2500 : 7000;
    const step = phone ? Math.max(2, gap - 1) : gap;

    const keep = (points: number[]) => {
      // Too many dots: drop some at random, evenly.
      const n = points.length / 2;
      const take = Math.min(n, cap);
      hx = new Float32Array(take);
      hy = new Float32Array(take);
      const ratio = n / take;
      for (let i = 0; i < take; i++) {
        const j = Math.floor(i * ratio);
        hx[i] = points[j * 2];
        hy[i] = points[j * 2 + 1];
      }
      dx = new Float32Array(take);
      dy = new Float32Array(take);
      moving = true;
      schedule();
    };

    const layout = async () => {
      const r = host.getBoundingClientRect();
      w = r.width;
      h = r.height;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement("canvas");
      off.width = Math.ceil(w);
      off.height = Math.ceil(h);
      const o = off.getContext("2d", { willReadFrequently: true })!;
      if (source.kind === "text") {
        const cs = getComputedStyle(host);
        await document.fonts.load(`800 ${cs.fontSize} ${cs.fontFamily}`).catch(() => {});
        o.font = `800 ${cs.fontSize} ${cs.fontFamily}`;
        const m = o.measureText(source.text);
        const asc = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.8;
        const desc = m.fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.2;
        o.textBaseline = "alphabetic";
        o.fillStyle = "#000";
        o.fillText(source.text, 0, (h - (asc + desc)) / 2 + asc);
      } else {
        const img = new Image();
        img.src = source.src;
        await img.decode().catch(() => {});
        if (!img.naturalWidth) return;
        o.drawImage(img, 0, 0, w, h);
      }
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const points: number[] = [];
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          const i = (y * off.width + x) * 4;
          const a = data[i + 3];
          if (a < 120) continue;
          // Photos: lighter areas get more dots
          if (source.kind === "image") {
            const light = (data[i] + data[i + 1] + data[i + 2]) / 765;
            if (Math.random() > 0.2 + 0.8 * light) continue;
          }
          // A small random offset, so it looks stippled rather than printed on a grid
          points.push(x + (Math.random() - 0.5) * step * 0.9, y + (Math.random() - 0.5) * step * 0.9);
        }
      }
      keep(points);
    };

    const frame = () => {
      raf = 0;
      if (!visible) return;
      const r = c.getBoundingClientRect();
      const px = pointer.x - r.left;
      const py = pointer.y - r.top;
      const near = px > -radius && py > -radius && px < r.width + radius && py < r.height + radius;
      if (!moving && !near) return;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      let still = true;
      const scaleX = r.width / w || 1; // the host may be scaled (parallax); keep the pointer in its own units
      const lx = px / scaleX;
      const ly = py / scaleX;
      for (let i = 0; i < hx.length; i++) {
        let x = hx[i] + dx[i];
        let y = hy[i] + dy[i];
        if (near && !reduce) {
          const ex = x - lx;
          const ey = y - ly;
          const d2 = ex * ex + ey * ey;
          if (d2 < radius * radius && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const push = ((radius - d) / radius) * 7;
            dx[i] += (ex / d) * push;
            dy[i] += (ey / d) * push;
          }
        }
        // Spring back home
        dx[i] *= 0.9;
        dy[i] *= 0.9;
        if (Math.abs(dx[i]) > 0.05 || Math.abs(dy[i]) > 0.05) still = false;
        else dx[i] = dy[i] = 0;
        x = hx[i] + dx[i];
        y = hy[i] + dy[i];
        ctx.fillRect(x, y, dot, dot);
      }
      moving = !still;
      if (moving || near) schedule();
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const move = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      schedule();
    };
    const gone = () => {
      pointer.x = pointer.y = -1e4;
      schedule();
    };
    const seen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) schedule();
    });
    seen.observe(c);
    const resize = new ResizeObserver(() => void layout());
    resize.observe(host);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", gone);
    return () => {
      cancelAnimationFrame(raf);
      seen.disconnect();
      resize.disconnect();
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", gone);
    };
    // `source` is described by `key`; the other props are fixed for a given use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, phone, reduce]);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
