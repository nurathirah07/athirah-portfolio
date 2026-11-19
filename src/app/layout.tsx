import type { Metadata } from "next";
import { preload } from "react-dom";
import "./globals.css";
import Nav from "@/components/Nav";
import Cursor from "@/components/Cursor";
import Curtain from "@/components/Curtain";
import Footer from "@/components/Footer";
import Glow from "@/components/Glow";
import SmoothScroll from "@/components/SmoothScroll";
import VisitNote from "@/components/VisitNote";
import { site, siteUrl } from "@/data/site";

export const metadata: Metadata = {
  // Link previews need full addresses; this makes relative ones (like the preview image) work.
  metadataBase: new URL(siteUrl),
  title: `${site.name} — ${site.role}`,
  description: site.tagline,
  // Shown when the link is shared in chat apps and on social media.
  openGraph: { title: `${site.name} — ${site.role}`, description: site.tagline, type: "website", siteName: site.name },
};

// Runs before the loading screen is drawn: the first full page load of a visit
// shows it; later ones in the same tab (a refresh, a typed address) skip it.
const INTRO_ONCE = `try{if(sessionStorage.getItem("intro"))document.documentElement.dataset.intro="seen";else sessionStorage.setItem("intro","1")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch the font with the page, not once the stylesheet asks for it, so text
  // is drawn in Manrope from the start instead of being laid out twice.
  preload("/fonts/manrope-latin-v1.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    // suppressHydrationWarning: browser extensions (e.g. QuillBot) add their own
    // attributes to <html> before React starts, and so does INTRO_ONCE
    // (data-intro); this only ignores those, on this one element.
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <body className="min-h-screen">
        {/* Loading screen, on the first page of a visit. Pure CSS (plus the one-line check above it), so it appears before the site's scripts run. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_ONCE }} />
        <div aria-hidden className="intro">
          <div className="intro-ring">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
          <p className="intro-count" />
          <p className="intro-name">{site.name}</p>
          <span className="intro-bar" />
        </div>
        <a href="#content" className="fixed left-4 top-4 z-[400] -translate-y-24 rounded-full bg-gold px-5 py-2.5 font-accent text-xs text-ink transition-transform focus-visible:translate-y-0">
          Skip to content
        </a>
        <Curtain />
        <SmoothScroll />
        <VisitNote />
        <Glow />
        <Cursor />
        <Nav />
        {/* overflow-x-clip: decorative glows may hang past the edge without widening the page (clip keeps sticky sections working). */}
        <main id="content" className="relative z-10 overflow-x-clip px-6 pt-32 pb-24 md:px-12 md:pb-32">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
