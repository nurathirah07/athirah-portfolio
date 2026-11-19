import { useSyncExternalStore } from "react";

// True on phone-sized screens (below Tailwind's md breakpoint), kept up to date
// as the window resizes. False on the server and in the first paint.
const query = "(max-width: 767px)";
const watch = (update: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", update);
  return () => list.removeEventListener("change", update);
};

export function usePhone() {
  return useSyncExternalStore(watch, () => window.matchMedia(query).matches, () => false);
}

// The opposite question, with the opposite starting answer: true on wider
// screens, but false on the server and in the first paint. For choosing a
// heavy desktop-only version of something (many animated layers): the light
// version is built first everywhere, so phones never build the heavy one only
// to throw it away a moment later. Navigating within the site renders straight
// away with the real answer; only a full page load starts light.
export function useWide() {
  return useSyncExternalStore(watch, () => !window.matchMedia(query).matches, () => false);
}
