import { useSyncExternalStore } from "react";

// True when the visitor has asked for reduced motion, kept up to date if they
// change it. False on the server and in the first paint, like usePhone.
//
// Use this (not Motion's useReducedMotion) wherever the setting changes what is
// on the page, such as a still image instead of a video, or buttons that only
// exist with motion on. The server can't know the setting, so deciding it in
// the first paint makes React throw that part away and redraw it (React error #418).
// Motion's hook is still right for animation values and effects.
const query = "(prefers-reduced-motion: reduce)";
const watch = (update: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", update);
  return () => list.removeEventListener("change", update);
};

export function usePrefersStill() {
  return useSyncExternalStore(watch, () => window.matchMedia(query).matches, () => false);
}
