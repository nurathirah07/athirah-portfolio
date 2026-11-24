"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { keepForNextPage, nextPageNumber, nextVisitNumber, rememberOwner, send, sendKept, trackingOff, visitId } from "@/lib/visits/client";

// Feeds the admin's visitor log (Admin → Visitors): each page opened, and how
// long it stayed open. Nothing is drawn. See lib/visits/client.ts for when it
// stays silent (your own browser, test robots, Do Not Track).
export default function VisitTracker() {
  const path = usePathname();
  const started = useRef(false); // whether this tab's first page has been sent

  useEffect(() => {
    if (!started.current) rememberOwner();
    if (trackingOff() || path.startsWith("/admin")) return;
    const visit = visitId();
    if (!visit) return;

    // The first page of a tab's visit also says where it came from.
    const first = !started.current && visit.fresh;
    if (!started.current) sendKept(); // the previous page's time, in case its own message was cancelled
    started.current = true;
    const params = new URLSearchParams(location.search);
    const k = nextPageNumber();
    send({
      t: "view",
      id: visit.id,
      path,
      k,
      ...(first ? { ref: document.referrer, tag: params.get("ref") ?? params.get("utm_source") ?? "", n: nextVisitNumber() } : {}),
    });

    // How long the page stayed open: until the next page, the tab is hidden
    // (switched away, phone locked) or closed, whichever comes first.
    const opened = Date.now();
    let reported = false;
    const leave = (closing = false) => {
      if (reported) return;
      reported = true;
      const stay = { t: "stay", id: visit.id, path, k, s: (Date.now() - opened) / 1000 };
      send(stay);
      if (closing) keepForNextPage(stay);
    };
    const hidden = () => document.visibilityState === "hidden" && leave();
    const closing = () => leave(true);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", closing);
    return () => {
      leave();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", closing);
    };
  }, [path]);

  return null;
}
