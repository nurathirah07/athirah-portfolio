import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen">
        {/* Loading screen, shown once per full page load. Pure CSS, so it appears before any script runs. */}
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
