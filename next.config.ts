import type { NextConfig } from "next";

const onVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  images: {
    // On our own server Next resizes photos to the size each screen needs.
    // WebP at quality 85: AVIF at 75 was smaller but visibly smeared knit and fabric textures.
    // On the Vercel demo optimisation stays off: the Hobby plan's monthly limit returned HTTP 402.
    unoptimized: onVercel,
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    qualities: [85],
    remotePatterns: [
      { protocol: "https", hostname: "celinebaby.kz", pathname: "/image/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  poweredByHeader: false,
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
