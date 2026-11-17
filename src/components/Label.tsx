// The small gold "(Section name)" label used above content.
export default function Label({ children, as: Tag = "p" }: { children: string; as?: "p" | "h2" }) {
  return <Tag className="font-accent text-xs text-gold md:text-sm">({children})</Tag>;
}
