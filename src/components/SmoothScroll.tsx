"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";
import { setLenis } from "@/lib/scroll";

// Smooth wheel scrolling with Lenis, for mice and trackpads only. On touch
// screens the browser's own scrolling is already smooth, and Lenis would only
// add work: it keeps re-reading the scroll position, which made phones stutter.
// So phones don't even download it: it is loaded only once a mouse is found.
export default function SmoothScroll() {
  const path = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let lenis: Lenis | null = null;
    let id = 0;
    let gone = false;
    void import("lenis").then(({ default: SmoothLenis }) => {
      if (gone) return;
      const smooth = new SmoothLenis({ duration: 1.2 });
      lenis = smooth;
      lenisRef.current = smooth;
      setLenis(smooth);
      const raf = (t: number) => { smooth.raf(t); id = requestAnimationFrame(raf); };
      id = requestAnimationFrame(raf);
    });
    return () => { gone = true; cancelAnimationFrame(id); lenis?.destroy(); lenisRef.current = null; setLenis(null); };
  }, []);

  // Start each new page at the top.
  useEffect(() => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [path]);

  return null;
}
