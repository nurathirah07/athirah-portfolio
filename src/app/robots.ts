import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";

// Tells search engines what they may visit. Everything public is allowed; the
// admin (which only runs on your computer) and Mira's AI route are not pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
