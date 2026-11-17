// The line that opens a section: its number, its name, and a rule running to
// the edge. `tone="ink"` is for light (matte) panels.
export default function SectionHead({ index, label, tone = "cream" }: { index: string; label: string; tone?: "cream" | "ink" }) {
  const ink = tone === "ink";
  return (
    <p className="flex items-center gap-4 font-accent text-[11px]">
      <span className={ink ? "text-flame" : "text-gold"}>{index}</span>
      <span className={ink ? "text-ink/70" : "text-cream/70"}>{label}</span>
      <span aria-hidden className={`h-px flex-1 ${ink ? "bg-ink/15" : "bg-cream/12"}`} />
    </p>
  );
}
