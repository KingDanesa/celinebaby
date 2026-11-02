import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const site = siteUrl();
  // Only the real domain is indexed; the temporary preview address and the demo stay out of search.
  if (new URL(site).hostname !== "celinebaby.kz") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/*/account", "/*/cart", "/*/checkout", "/*/pay/", "/*/wishlist", "/*?*sort="],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
