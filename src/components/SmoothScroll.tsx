"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { setLenis } from "@/lib/scroll";

// Smooth wheel scrolling with Lenis, for mice and trackpads only. On touch
// screens the browser's own scrolling is already smooth, and Lenis would only
// add work: it keeps re-reading the scroll position, which made phones stutter.
export default function SmoothScroll() {
  const path = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const lenis = new Lenis({ duration: 1.2 });
    lenisRef.current = lenis;
    setLenis(lenis);
    let id = 0;
    const raf = (t: number) => { lenis.raf(t); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(id); lenis.destroy(); lenisRef.current = null; setLenis(null); };
  }, []);

  // Start each new page at the top.
  useEffect(() => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }, [path]);

  return null;
}
