import "server-only";
import { cache } from "react";
import { db, dbEnabled } from "@/lib/db";
import type { Locale } from "@/i18n/config";

/**
 * The thin strip above the header ("Бесплатная доставка от 50 000 ₸"), edited in /admin/announcement.
 * Stored as JSON in app_meta; until it is saved the texts from the dictionaries are shown.
 */
export interface AnnouncementItem {
  ru: string;
  /** Empty → the Russian text is shown on the Kazakh site too. */
  kk: string;
  /** Optional page of our site (/catalog/novinki) or a full https:// address. */
  link: string;
}

export interface Announcement {
  enabled: boolean;
  items: AnnouncementItem[];
}

export const MAX_ITEMS = 12;
const KEY = "announcement";

/** First version kept two fixed lines and one link for both. */
type V1 = { enabled: boolean; ru: [string, string]; kk: [string, string]; link: string };

function parse(raw: string): Announcement {
  const v = JSON.parse(raw) as Announcement | V1;
  if ("items" in v) return v;
  return {
    enabled: v.enabled,
    items: [0, 1].map((i) => ({ ru: v.ru[i] ?? "", kk: v.kk[i] ?? "", link: v.link })).filter((it) => it.ru || it.kk),
  };
}

export const getAnnouncement = cache(async (): Promise<Announcement | null> => {
  if (!dbEnabled()) return null;
  try {
    const [row] = await db()<{ value: string }[]>`select value from app_meta where key = ${KEY}`;
    return row ? parse(row.value) : null;
  } catch {
    return null;
  }
});

/** What the site shows in this language. */
export function announcementFor(a: Announcement | null, locale: Locale, fallback: string[]): { text: string; link: string }[] {
  if (!a) return fallback.map((text) => ({ text, link: "" }));
  if (!a.enabled) return [];
  return a.items
    .map((it) => ({ text: ((locale === "kk" && it.kk.trim()) || it.ru).trim(), link: it.link }))
    .filter((it) => it.text);
}

export async function saveAnnouncement(a: Announcement) {
  const value = JSON.stringify(a);
  await db()`insert into app_meta (key, value) values (${KEY}, ${value}) on conflict (key) do update set value = excluded.value`;
}
