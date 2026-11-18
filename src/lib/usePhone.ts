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
