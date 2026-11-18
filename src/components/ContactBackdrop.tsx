import ScenePhoto from "@/components/ScenePhoto";

// Background behind Mira on the Contact page: fluted glass lit in flame and
// amethyst, moving slowly, with light running across the flutes. It's dimmed
// most where Mira and her words sit, and fades out before the email section.
export default function ContactBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[calc(100svh+7rem)] min-h-176 overflow-hidden mask-[linear-gradient(to_bottom,#000_70%,transparent)]"
    >
      <ScenePhoto src="/images/backgrounds/contact.webp" glint={0.22} position="35% 50%" preload />
      {/* Desktop only: on phones it is one more full-screen blended layer */}
      <div className="flute-sheen absolute inset-0 hidden opacity-25 mix-blend-overlay md:block" />

      <div className="absolute inset-0 bg-ink/30" />
      {/* A darker pool in the middle so Mira and her questions stay easy to read */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_42%_50%_at_50%_52%,rgb(0_15_8/0.72),rgb(0_15_8/0.35)_60%,transparent)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ink/85 to-transparent" />
      <div className="absolute inset-0 grain" />
    </div>
  );
}
