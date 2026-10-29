"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  /** Prefix a path with the current locale. */
  href: (path: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const value: I18nValue = {
    locale,
    t: dict,
    href: (path) => `/${locale}${path.startsWith("/") ? path : `/${path}`}`,
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
