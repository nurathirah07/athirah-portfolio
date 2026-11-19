"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import Icon from "@/components/Icon";
import type { Shot } from "@/data/site";

// One screenshot at full width, over everything, for a proper look on a small
// screen. Long pages scroll inside it. A native <dialog>: Escape closes it,
// focus stays inside while it's open and returns afterwards.
export default function ShotViewer({ shot, onClose }: { shot: Shot | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (shot && !el.open) el.showModal();
    if (!shot && el.open) el.close();
  }, [shot]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // A tap on the dark area around the picture closes it.
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      data-lenis-prevent=""
      aria-label={shot ? `Screenshot: ${shot.alt}` : "Screenshot"}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto overscroll-contain bg-ink/95 p-0 text-cream backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
    >
      {shot && (
        <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 pb-10 pt-4 md:px-8">
          <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between gap-4 bg-ink/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
            <p className="min-w-0 truncate text-sm text-cream/80">{shot.alt}</p>
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className="shrink-0 rounded-full border border-cream/25 px-4 py-2 font-accent text-xs text-cream transition-colors hover:border-gold hover:text-gold"
            >
              Close <Icon name="close" className="ml-0.5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <Image
              src={shot.src}
              alt={shot.alt}
              width={shot.width}
              height={shot.height}
              unoptimized
              className="mx-auto h-auto w-full rounded-xl border border-cream/15"
              style={{ maxWidth: shot.width < shot.height ? "28rem" : undefined }}
            />
            <p className="mt-4 text-center font-accent text-xs text-cream/60 md:hidden">Pinch to zoom</p>
          </div>
        </div>
      )}
    </dialog>
  );
}
