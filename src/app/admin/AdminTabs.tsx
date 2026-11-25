import TransitionLink from "@/components/TransitionLink";
import { editorEnabled } from "@/lib/admin/auth";
import { signOut } from "./actions";
import MarkOwner from "./MarkOwner";

const tabs = [
  { href: "/admin", label: "Projects", id: "projects" },
  { href: "/admin/visitors", label: "Visitors", id: "visitors" },
] as const;

// The admin's pages (the project editor only on your computer), and signing out.
export default function AdminTabs({ current }: { current: (typeof tabs)[number]["id"] }) {
  const shown = tabs.filter((tab) => editorEnabled || tab.id !== "projects");
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <MarkOwner />
      <nav aria-label="Admin" className="flex gap-2">
        {shown.map((tab) => (
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
      <div className="flex items-center gap-4">
        {!editorEnabled && <p className="text-xs text-cream/50">Projects are edited on your computer (npm run dev).</p>}
        <form action={signOut}>
          <button type="submit" className="rounded-full border border-cream/15 px-4 py-2 font-accent text-[13px] text-cream/60 transition-colors hover:border-flame hover:text-flame">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
