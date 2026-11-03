"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { audit } from "./audit";
import { dbEnabled } from "@/lib/db";
import { getAnnouncement, saveAnnouncement, type Announcement } from "@/lib/announcement";

export type AnnouncementFormState = { ok?: string; error?: string };

const MAX = 80;
const clean = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\s+/g, " ").trim();

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

export async function saveAnnouncementAction(_prev: AnnouncementFormState | undefined, form: FormData): Promise<AnnouncementFormState> {
  const me = await requireAdmin();
  if (!dbEnabled()) return { error: "Объявление меняется на боевом сервере." };
  const a: Announcement = {
    enabled: form.get("enabled") === "on",
    ru: [clean(form.get("ru1")), clean(form.get("ru2"))],
    kk: [clean(form.get("kk1")), clean(form.get("kk2"))],
    link: "",
  };
  if ([...a.ru, ...a.kk].some((s) => s.length > MAX)) return { error: `Каждая строка — не длиннее ${MAX} символов, иначе на телефоне не поместится.` };
  if (a.enabled && !a.ru[0] && !a.ru[1]) return { error: "Напишите хотя бы одну строку по-русски или выключите объявление." };
  const link = normalizeLink(clean(form.get("link")));
  if (link === null) return { error: "Ссылка: страница нашего сайта (например, /catalog/novinki) или полный адрес, начинающийся с https://" };
  a.link = link;

  const before = await getAnnouncement();
  await saveAnnouncement(a);
  const details: string[] = [];
  if (!before || before.enabled !== a.enabled) details.push(a.enabled ? "Показывается" : "Скрыто");
  const ruText = a.ru.filter(Boolean).join(" · ");
  if (!before || before.ru.join("|") !== a.ru.join("|")) details.push(`Текст: ${ruText || "—"}`);
  if (!before || before.kk.join("|") !== a.kk.join("|")) details.push("Текст на казахском изменён");
  if ((before?.link ?? "") !== a.link) details.push(`Ссылка: ${a.link || "нет"}`);
  if (details.length) await audit("announcement_updated", { admin: me, label: ruText.slice(0, 80) || "объявление", details });
  revalidatePath("/", "layout");
  return { ok: "Сохранено. На сайте уже видно." };
}
