/**
 * Cleans a link typed in the admin: "/catalog/x" or "https://celinebaby.kz/ru/catalog/x" → "/catalog/x"
 * (the site adds the visitor's language), other https links stay as they are. "" = no link, null = invalid.
 */
export function normalizeLink(raw: string): string | null {
  if (!raw) return "";
  let s = raw.trim();
  const own = s.match(/^(?:https?:\/\/)?(?:www\.)?celinebaby\.kz(\/.*)?$/i);
  if (own) s = own[1] || "/";
  if (s.startsWith("/")) return /^\/[^\s:]*$/.test(s) ? s.replace(/^\/(ru|kk)(?=\/|$)/, "") || "/" : null;
  if (/^https:\/\/[^\s]+$/i.test(s) && s.indexOf("://", 8) < 0) return s;
  return null;
}
