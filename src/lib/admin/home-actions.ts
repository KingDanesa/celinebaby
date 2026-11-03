"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { audit } from "./audit";
import { dbEnabled } from "@/lib/db";
import { normalizeLink } from "@/lib/links";
import { defaultHome, getHomeOverrides, setHomeBlock } from "@/lib/home";
import { BLOCK_NAMES, HAS_SUB, TILE_KEYS, type Benefit, type BlockKey, type Focus, type HomeTile, type L, type Media, type StoreBlock, type TileKey } from "@/lib/home-types";

export type HomeSaveResult = { ok: true } | { ok: false; error: string };

class Bad extends Error {}
const fail = (msg: string): never => {
  throw new Bad(msg);
};

const str = (v: unknown, max: number, label: string) => {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  if (s.length > max) fail(`${label}: не длиннее ${max} символов.`);
  return s;
};
const text = (v: unknown, max: number, label: string, required = true): L => {
  const o = (v ?? {}) as Partial<L>;
  const l = { ru: str(o.ru, max, label), kk: str(o.kk, max, label) };
  if (required && !l.ru) fail(`${label}: напишите текст по-русски.`);
  return l;
};
/** Only our own files: uploads from the admin or the site's built-in pictures. */
const SRC_RE = /^\/(uploads|img|video|image)\/[^\s:?#]+$/;
const media = (v: unknown, label: string): Media => {
  const m = (v ?? {}) as Partial<Media>;
  if ((m.kind !== "image" && m.kind !== "video") || typeof m.src !== "string" || !SRC_RE.test(m.src)) fail(`${label}: загрузите фото или видео.`);
  const out: Media = { kind: m.kind!, src: m.src! };
  if (m.kind === "video" && typeof m.poster === "string" && SRC_RE.test(m.poster)) out.poster = m.poster;
  return out;
};
const focus = (v: unknown): Focus => {
  const f = (v ?? {}) as Partial<Focus>;
  const c = (n: unknown) => Math.min(100, Math.max(0, Math.round(Number(n) || 0)));
  return { x: c(f.x ?? 50), y: c(f.y ?? 50) };
};
const link = (v: unknown, label: string) => {
  const l = normalizeLink(typeof v === "string" ? v : "");
  if (l === null) return fail(`${label}: страница нашего сайта (например, /catalog/novinki) или полный адрес, начинающийся с https://`);
  return l;
};

function cleanTile(key: TileKey, v: unknown): HomeTile {
  const t = (v ?? {}) as Partial<HomeTile>;
  return {
    title: text(t.title, 40, "Надпись"),
    sub: HAS_SUB.includes(key) ? text(t.sub, 50, "Подпись", false) : { ru: "", kk: "" },
    media: media(t.media, "Фото или видео"),
    mobile: t.mobile ? media(t.mobile, "Фото или видео для телефона") : null,
    focus: focus(t.focus),
    focusMobile: focus(t.focusMobile),
    link: link(t.link, "Ссылка") || fail("Выберите, куда ведёт нажатие на блок."),
  };
}

function cleanStore(v: unknown): StoreBlock {
  const s = (v ?? {}) as Partial<StoreBlock>;
  const map = typeof s.map === "string" ? s.map.trim() : "";
  if (map && !/^https:\/\/\S+$/i.test(map)) fail("Ссылка на карту: полный адрес, начинающийся с https:// (например, из 2ГИС).");
  return {
    title: text(s.title, 40, "Заголовок"),
    address: text(s.address, 60, "Адрес"),
    hours: text(s.hours, 60, "Часы работы", false),
    cta: text(s.cta, 30, "Кнопка", !!map),
    map,
  };
}

function cleanBenefits(v: unknown): Benefit[] {
  const list = Array.isArray(v) ? v : [];
  if (list.length !== 4) fail("Преимуществ должно быть ровно четыре — так устроена строка.");
  return list.map((b: Partial<Benefit>, i) => ({
    title: text(b?.title, 40, `Преимущество ${i + 1}, заголовок`),
    text: text(b?.text, 50, `Преимущество ${i + 1}, текст`, false),
  }));
}

const isTile = (k: string): k is TileKey => (TILE_KEYS as readonly string[]).includes(k);
const isBlock = (k: string): k is BlockKey => isTile(k) || k === "store" || k === "benefits";

/** What changed, in words, for the journal. */
function describe(key: BlockKey, before: unknown, after: unknown): string[] {
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const same = (k: string) => JSON.stringify(b?.[k]) === JSON.stringify(a?.[k]);
  const out: string[] = [];
  if (key === "benefits") {
    (after as Benefit[]).forEach((x, i) => {
      if (JSON.stringify((before as Benefit[])[i]) !== JSON.stringify(x)) out.push(`${i + 1}. ${x.title.ru}${x.text.ru ? ` — ${x.text.ru}` : ""}`);
    });
    return out;
  }
  if (key === "store") {
    const s = after as StoreBlock;
    if (!same("title")) out.push(`Заголовок: ${s.title.ru}`);
    if (!same("address")) out.push(`Адрес: ${s.address.ru}`);
    if (!same("hours")) out.push(`Часы: ${s.hours.ru || "—"}`);
    if (!same("cta") || !same("map")) out.push("Кнопка или ссылка на карту изменена");
    return out;
  }
  const t = after as HomeTile;
  if (!same("title")) out.push(`Надпись: ${t.title.ru}`);
  if (!same("sub")) out.push(`Подпись: ${t.sub.ru || "—"}`);
  if (!same("media")) out.push(t.media.kind === "video" ? "Новое видео" : "Новое фото");
  if (!same("mobile")) out.push(t.mobile ? `Своё ${t.mobile.kind === "video" ? "видео" : "фото"} для телефона` : "Для телефона — как на компьютере");
  if (!same("focus") || !same("focusMobile")) out.push("Изменена видимая часть кадра");
  if (!same("link")) out.push(`Ссылка: ${t.link || "нет"}`);
  return out;
}

export async function saveHomeBlockAction(key: string, value: unknown): Promise<HomeSaveResult> {
  const me = await requireAdmin();
  if (!dbEnabled()) return { ok: false, error: "Главная меняется на боевом сервере." };
  if (!isBlock(key)) return { ok: false, error: "Неизвестный блок" };
  let clean: unknown;
  try {
    clean = isTile(key) ? cleanTile(key, value) : key === "store" ? cleanStore(value) : cleanBenefits(value);
  } catch (e) {
    if (e instanceof Bad) return { ok: false, error: e.message };
    throw e;
  }
  const d = defaultHome();
  const o = await getHomeOverrides();
  const before = isTile(key) ? (o[key] ?? d.tiles[key]) : key === "store" ? (o.store ?? d.store) : (o.benefits ?? d.benefits);
  await setHomeBlock(key, clean);
  const details = describe(key, before, clean);
  if (details.length) await audit("home_updated", { admin: me, target: key, label: BLOCK_NAMES[key], details });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetHomeBlockAction(key: string): Promise<HomeSaveResult> {
  const me = await requireAdmin();
  if (!dbEnabled()) return { ok: false, error: "Главная меняется на боевом сервере." };
  if (!isBlock(key)) return { ok: false, error: "Неизвестный блок" };
  await setHomeBlock(key, null);
  await audit("home_reset", { admin: me, target: key, label: BLOCK_NAMES[key], details: ["Возвращено как было"] });
  revalidatePath("/", "layout");
  return { ok: true };
}
