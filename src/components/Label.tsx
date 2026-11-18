// A small caption naming what follows (for example "Built with" above a list of tags).
export default function Label({ children, as: Tag = "p" }: { children: string; as?: "p" | "h2" }) {
  return <Tag className="font-accent text-sm text-cream/70">{children}</Tag>;
}
