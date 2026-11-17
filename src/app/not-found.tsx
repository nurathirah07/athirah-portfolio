import RollText from "@/components/RollText";
import TransitionLink from "@/components/TransitionLink";
import { site } from "@/data/site";

export const metadata = { title: `Page not found — ${site.name}` };

// Shown for any address that doesn't exist, including a project that was removed.
export default function NotFound() {
  return (
    <div className="flex min-h-[60svh] flex-col items-start justify-center">
      <p className="font-accent text-xs text-gold">(Error 404)</p>
      <h1 className="mt-4 font-display text-5xl leading-[1.02] md:text-7xl">Page not found</h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-cream/75">
        This address doesn&apos;t lead anywhere. The page may have moved, or the link may be mistyped.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <TransitionLink href="/" className="roll-plain btn-gloss rounded-full px-7 py-3.5 font-accent text-sm">
          <RollText>Back to home</RollText>
        </TransitionLink>
        <TransitionLink href="/work" className="rounded-full border border-cream/20 px-7 py-3.5 font-accent text-sm transition-colors duration-300 hover:border-gold hover:text-gold">
          See my projects
        </TransitionLink>
      </div>
    </div>
  );
}
