"use client";
import { useSyncExternalStore } from "react";

// Athirah's current time, so visitors can tell whether she's likely awake.
// The server (and the first paint) shows only the offset; the clock fills in
// on the device and updates every half minute.
const zone = "Asia/Kuala_Lumpur";
const format = new Intl.DateTimeFormat("en-MY", { timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true });

function subscribe(update: () => void) {
  const timer = setInterval(update, 30_000);
  return () => clearInterval(timer);
}

export default function LocalTime() {
  const time = useSyncExternalStore(subscribe, () => format.format(new Date()).toUpperCase(), () => "");
  return (
    <>
      UTC+8
      {time && (
        <>
          <span aria-hidden className="mx-2 text-cream/55 md:text-cream/30">·</span>
          <time className="tabular-nums">{time}</time> <span className="text-cream/70 md:text-cream/50">now</span>
        </>
      )}
    </>
  );
}
