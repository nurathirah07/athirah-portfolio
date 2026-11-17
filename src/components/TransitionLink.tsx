"use client";
import Link from "next/link";
import type { ComponentProps } from "react";

export const CURTAIN_EVENT = "curtain:go";
// Where to go, and the point on screen the transition should grow from.
export type CurtainRequest = { href: string; x: number; y: number };

// A normal Next link that asks the Curtain to cover the page before navigating.
// Ctrl/Cmd-click and friends keep their usual browser behaviour.
export default function TransitionLink({
  href,
  onClick,
  ...rest
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        // Keyboard activation has no pointer position, so use the link's centre.
        const box = e.currentTarget.getBoundingClientRect();
        const fromKeyboard = e.clientX === 0 && e.clientY === 0;
        const detail: CurtainRequest = {
          href,
          x: fromKeyboard ? box.left + box.width / 2 : e.clientX,
          y: fromKeyboard ? box.top + box.height / 2 : e.clientY,
        };
        window.dispatchEvent(new CustomEvent(CURTAIN_EVENT, { detail }));
      }}
    />
  );
}
