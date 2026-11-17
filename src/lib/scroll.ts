import type Lenis from "lenis";

let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

// Scrolls through Lenis when it's running, so jumps match normal scrolling.
export function scrollToY(top: number, duration = 0.7) {
  if (lenis) lenis.scrollTo(top, { duration });
  else window.scrollTo({ top });
}
