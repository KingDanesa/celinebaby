"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { audit } from "./audit";
import { dbEnabled } from "@/lib/db";
import { MAX_ITEMS, getAnnouncement, saveAnnouncement, type Announcement, type AnnouncementItem } from "@/lib/announcement";

export type AnnouncementFormState = { ok?: string; error?: string };

const MAX = 80;
const clean = (v: FormDataEntryValue | null | undefined) => String(v ?? "").replace(/\s+/g, " ").trim();

/** "/catalog/x", "https://celinebaby.kz/ru/catalog/x" → "/catalog/x"; other https links stay as they are. */
function normalizeLink(raw: string): string | null {
  if (!raw) return "";
  let s = raw.trim();
  const own = s.match(/^(?:https?:\/\/)?(?:www\.)?celinebaby\.kz(\/.*)?$/i);
  if (own) s = own[1] || "/";
  if (s.startsWith("/")) return /^\/[^\s:]*$/.test(s) ? s.replace(/^\/(ru|kk)(?=\/|$)/, "") || "/" : null;
  if (/^https:\/\/[^\s]+$/i.test(s) && s.indexOf("://", 8) < 0) return s;
  return null;
}

const itemKey = (it: AnnouncementItem) => `${it.ru}|${it.kk}|${it.link}`;

export async function saveAnnouncementAction(_prev: AnnouncementFormState | undefined, form: FormData): Promise<AnnouncementFormState> {
  const me = await requireAdmin();
  if (!dbEnabled()) return { error: "Объявление меняется на боевом сервере." };
  const ru = form.getAll("ru"), kk = form.getAll("kk"), links = form.getAll("link");
  const items: AnnouncementItem[] = [];
  for (let i = 0; i < ru.length; i++) {
    const it = { ru: clean(ru[i]), kk: clean(kk[i]), link: clean(links[i]) };
    if (!it.ru && !it.kk && !it.link) continue; // an empty row is just dropped
    const n = items.length + 1;
    if (!it.ru) return { error: `Надпись ${n}: напишите текст по-русски или удалите её.` };
    if (it.ru.length > MAX || it.kk.length > MAX) return { error: `Надпись ${n}: не длиннее ${MAX} символов, иначе на телефоне не поместится.` };
    const link = normalizeLink(it.link);
    if (link === null) return { error: `Надпись ${n}, ссылка: страница нашего сайта (например, /catalog/novinki) или полный адрес, начинающийся с https://` };
    items.push({ ...it, link });
  }
  if (items.length > MAX_ITEMS) return { error: `Не больше ${MAX_ITEMS} надписей.` };
  const a: Announcement = { enabled: form.get("enabled") === "on", items };
  if (a.enabled && items.length === 0) return { error: "Добавьте хотя бы одну надпись или выключите полоску." };

  const before = await getAnnouncement();
  await saveAnnouncement(a);
  const details: string[] = [];
  if (!before || before.enabled !== a.enabled) details.push(a.enabled ? "Показывается" : "Скрыто");
  if (!before || before.items.map(itemKey).join("\n") !== items.map(itemKey).join("\n")) {
    items.forEach((it, i) => details.push(`${i + 1}. ${it.ru}${it.link ? ` → ${it.link}` : ""}`));
    if (!items.length) details.push("Надписей нет");
  }
  if (details.length) await audit("announcement_updated", { admin: me, label: items[0]?.ru.slice(0, 80) || "объявление", details });
  revalidatePath("/", "layout");
  return { ok: "Сохранено. На сайте уже видно." };
}
