import type Lenis from "lenis";

let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

// Scrolls through Lenis when it's running, so jumps match normal scrolling.
// Without it (touch screens), the browser glides there itself.
export function scrollToY(top: number, duration = 0.7) {
  if (lenis) lenis.scrollTo(top, { duration });
  else window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

// Stops the page scrolling (while a full-screen panel is open) and lets it
// scroll again. Works with Lenis on mice and trackpads, and on touch screens.
export function lockScroll(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
  for (const el of [document.documentElement, document.body]) el.style.overflow = locked ? "hidden" : "";
}
