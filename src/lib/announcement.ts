import "server-only";
import { cache } from "react";
import { db, dbEnabled } from "@/lib/db";
import type { Locale } from "@/i18n/config";

/**
 * The thin strip above the header ("Бесплатная доставка от 50 000 ₸"), edited in /admin/announcement.
 * Stored as JSON in app_meta; until it is saved the texts from the dictionaries are shown.
 */
export interface Announcement {
  enabled: boolean;
  ru: [string, string];
  kk: [string, string];
  /** Optional page of our site the strip leads to, e.g. /catalog/novinki. */
  link: string;
}

const KEY = "announcement";

export const getAnnouncement = cache(async (): Promise<Announcement | null> => {
  if (!dbEnabled()) return null;
  try {
    const [row] = await db()<{ value: string }[]>`select value from app_meta where key = ${KEY}`;
    return row ? (JSON.parse(row.value) as Announcement) : null;
  } catch {
    return null;
  }
});

/** What the site shows in this language: up to two lines (Kazakh falls back to Russian), and the link. */
export function announcementFor(a: Announcement | null, locale: Locale, fallback: [string, string]): { lines: string[]; link: string } {
  if (!a) return { lines: fallback, link: "" };
  if (!a.enabled) return { lines: [], link: "" };
  const own = (locale === "kk" ? a.kk : a.ru).map((s) => s.trim());
  const lines = own.some(Boolean) ? own : a.ru.map((s) => s.trim());
  return { lines: lines.filter(Boolean), link: a.link };
}

export async function saveAnnouncement(a: Announcement) {
  const value = JSON.stringify(a);
  await db()`insert into app_meta (key, value) values (${KEY}, ${value}) on conflict (key) do update set value = excluded.value`;
}
