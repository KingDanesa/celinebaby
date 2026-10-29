import { getDictionary } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";

/** Shared helper for simple pages: resolves locale, dictionary and href(). */
export async function pageContext(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  const l: Locale = isLocale(locale) ? locale : "ru";
  const t = getDictionary(l);
  const href = (p: string) => `/${l}${p}`;
  return { locale: l, t, href };
}
