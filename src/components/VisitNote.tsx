"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Notes, for this visit only, that the visitor has looked at the projects.
// Mira uses it to ask whether any of them is close to what they want.
// Nothing leaves the browser.
export default function VisitNote() {
  const path = usePathname();
  useEffect(() => {
    if (!path.startsWith("/work")) return;
    try {
      sessionStorage.setItem("mira:seenWork", "1");
    } catch {
      // Storage can be blocked; Mira just asks her usual question.
    }
  }, [path]);
  return null;
}
