import TransitionLink from "@/components/TransitionLink";

// The "View project" pill: outlined in gold with an arrow badge. It fills with
// gold on hover or keyboard focus, and turns flame while it is being pressed.
// - `size="lg"` is the big version used as a card's main action.
// - With `card`, it also lights up whenever the card around it (a `group`) is hovered.
export default function ViewButton({
  href,
  label,
  card = false,
  size = "md",
}: {
  href: string;
  label: string;
  card?: boolean;
  size?: "md" | "lg";
}) {
  const large = size === "lg";

  return (
    <TransitionLink
      href={href}
      aria-label={label}
      className={`group/view relative z-2 inline-flex shrink-0 items-center whitespace-nowrap rounded-full border-gold/70 bg-gold/5 font-accent text-gold transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-ink focus-visible:border-gold focus-visible:bg-gold focus-visible:text-ink focus-visible:outline-none active:border-flame active:bg-flame active:text-ink ${
        large ? "gap-5 border-2 py-2 pl-8 pr-2 text-sm md:text-base" : "gap-3 border py-1.5 pl-5 pr-1.5 text-[11px]"
      } ${card ? "group-hover:border-gold group-hover:bg-gold group-hover:text-ink group-active:border-flame group-active:bg-flame" : ""}`}
    >
      View project
      <span
        aria-hidden
        className={`grid place-items-center rounded-full bg-gold text-ink transition-[background-color,color,rotate] duration-300 group-hover/view:-rotate-45 group-hover/view:bg-ink group-hover/view:text-gold group-focus-visible/view:-rotate-45 group-focus-visible/view:bg-ink group-focus-visible/view:text-gold ${
          large ? "h-11 w-11 text-xl md:h-12 md:w-12" : "h-8 w-8 text-sm"
        } ${card ? "group-hover:-rotate-45 group-hover:bg-ink group-hover:text-gold" : ""}`}
      >
        →
      </span>
    </TransitionLink>
  );
}
