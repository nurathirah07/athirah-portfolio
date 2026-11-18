import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
