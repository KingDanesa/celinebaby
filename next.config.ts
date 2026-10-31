import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel Hobby limits optimised source images per month (we hit HTTP 402 with ~700 products),
    // so images are served as-is. Product photos are already resized (600×732) at the source.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "celinebaby.kz", pathname: "/image/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
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
