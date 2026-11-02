/**
 * Public address of the site, read at run time (SITE_URL), so the same build can run on a temporary
 * preview address and then on celinebaby.kz. NEXT_PUBLIC_SITE_URL is the older name, kept for the demo.
 */
export function siteUrl(): string {
  return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
