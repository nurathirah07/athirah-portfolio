"use client";
import { useEffect } from "react";
import { COPY_SHOWN_MS, copyPhases, type CopyEvent, type CopyPhase } from "./copyMachine";
import { useMachine } from "./useMachine";

/**
 * A copy-to-clipboard button's state (see copyMachine.ts). Returns the phase,
 * to show on the button (and as data-copy), and `copy(text)`, which resolves
 * to "copied", "failed" (the browser blocked it), or "busy" (a copy was
 * already under way, so this click was ignored).
 */
export function useCopy() {
  const [phase, machine] = useMachine<CopyPhase, CopyEvent>({ name: "idle" }, copyPhases);

  // "Copied" and "failed" show for a moment. Each new phase is a new object,
  // so copying again restarts the wait instead of ending it early.
  useEffect(() => {
    if (phase.name !== "copied" && phase.name !== "failed") return;
    const timer = setTimeout(() => machine.send({ type: "RESET" }), COPY_SHOWN_MS[phase.name]);
    return () => clearTimeout(timer);
  }, [phase, machine]);

  const copy = async (text: string): Promise<"copied" | "failed" | "busy"> => {
    if (!machine.send({ type: "COPY" })) return "busy";
    try {
      if (!navigator.clipboard) throw new Error("No clipboard");
      await navigator.clipboard.writeText(text);
      machine.send({ type: "DONE" });
      return "copied";
    } catch {
      machine.send({ type: "FAIL" });
      return "failed";
    }
  };

  return [phase, copy] as const;
}
