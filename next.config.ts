import type { NextConfig } from "next";

import { DEFAULT_COLLECTION } from "./src/lib/collections";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // The app opens on the default collection's board.
  async redirects() {
    return [{ source: "/", destination: `/c/${DEFAULT_COLLECTION}`, permanent: false }];
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
