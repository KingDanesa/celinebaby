import "server-only";
import { cache } from "react";
import { db, dbEnabled } from "@/lib/db";
import { getDictionary } from "@/i18n";
import { homeDefaults } from "./home-defaults";
import type { BlockKey, HomeContent, HomeOverrides } from "./home-types";

const KEY = "home";

export const getHomeOverrides = cache(async (): Promise<HomeOverrides> => {
  if (!dbEnabled()) return {};
  try {
    const [row] = await db()<{ value: string }[]>`select value from app_meta where key = ${KEY}`;
    const v = row ? JSON.parse(row.value) : {};
    return v && typeof v === "object" && !Array.isArray(v) ? (v as HomeOverrides) : {};
  } catch {
    return {};
  }
});

export const defaultHome = () => homeDefaults(getDictionary("ru"), getDictionary("kk"));

/** The home page with the owner's changes on top of the defaults. */
export async function getHome(): Promise<HomeContent> {
  const d = defaultHome();
  const o = await getHomeOverrides();
  const tiles = { ...d.tiles };
  for (const k of Object.keys(tiles) as (keyof typeof tiles)[]) if (o[k]) tiles[k] = o[k]!;
  return { tiles, store: o.store ?? d.store, benefits: o.benefits ?? d.benefits };
}

/** Saves one block (value) or returns it to the default (null). Read-modify-write in one statement. */
export async function setHomeBlock(key: BlockKey, value: unknown | null) {
  const patch = JSON.stringify(value === null ? {} : { [key]: value });
  await db()`
    insert into app_meta (key, value) values (${KEY}, ${patch})
    on conflict (key) do update
      set value = ((app_meta.value::jsonb - ${key}::text) || ${patch}::text::jsonb)::text`;
}
