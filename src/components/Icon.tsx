// Small line icons in the text's colour, sized to the text. They stand in for
// the symbols Manrope doesn't have (↗ ✓ ✎ ✕): typing those made the browser
// search the device for another font the first time one appeared, which held
// up the first paint of every page (↗ is in the footer) and caused a stutter
// on the first click that showed one (✓ after copying, ✎ in Mira's summary).
// Check a new symbol is in the font before typing it; otherwise add it here.
const paths = {
  external: "M7 17 17 7M8.5 7H17v8.5", // opens elsewhere (new tab, email app)
  check: "m5 12.5 4.5 4.5L19 7.5",
  edit: "M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3ZM13.5 8.5l2 2",
  close: "M6.5 6.5l11 11M17.5 6.5l-11 11",
};

export type IconName = keyof typeof paths;

export default function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block h-[0.95em] w-[0.95em] shrink-0 align-[-0.12em] ${className}`}
    >
      <path d={paths[name]} />
    </svg>
  );
}
