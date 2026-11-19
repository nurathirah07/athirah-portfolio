import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    // 90 for the About page's full-screen photos; everything else uses the default 75.
    qualities: [75, 90],
  },
  partialPrefetching: true,
  // The font's name carries its version (manrope-latin-v1), so browsers may
  // keep it for a year instead of asking again on every visit. Make a new
  // version's file under a new name.
  async headers() {
    return [{ source: "/fonts/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
  experimental: {
    // Don't reuse dev compilation from disk across restarts: it can keep an
    // old Tailwind stylesheet that's missing classes from new or changed
    // components (Mira was invisible because of this). Builds keep their cache.
    turbopackFileSystemCacheForDev: false,
    serverActions: {
      // Room for several project screenshots in one save from /admin.
      bodySizeLimit: "40mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
