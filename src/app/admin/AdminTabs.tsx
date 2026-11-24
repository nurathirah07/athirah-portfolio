import TransitionLink from "@/components/TransitionLink";

const tabs = [
  { href: "/admin", label: "Projects", id: "projects" },
  { href: "/admin/visitors", label: "Visitors", id: "visitors" },
] as const;

// The admin's two pages: the project editor and the visitor log.
export default function AdminTabs({ current }: { current: (typeof tabs)[number]["id"] }) {
  return (
    <nav aria-label="Admin" className="mb-8 flex gap-2">
      {tabs.map((tab) => (
        <TransitionLink
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === current ? "page" : undefined}
          className={`rounded-full border px-5 py-2.5 font-accent text-[13px] transition-colors ${tab.id === current ? "border-gold bg-gold/10 text-gold" : "border-cream/15 text-cream/70 hover:border-gold hover:text-gold"}`}
        >
          {tab.label}
        </TransitionLink>
      ))}
    </nav>
  );
}
