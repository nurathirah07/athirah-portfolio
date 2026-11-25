import type { MetadataRoute } from "next";
import { siteUrl } from "@/data/site";

// Tells search engines what they may visit. Everything public is allowed; the
// admin (signed-in only) and the API routes are not pages to list.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
