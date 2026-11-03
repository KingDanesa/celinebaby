import type { Dictionary } from "@/i18n";
import { homeTiles, STORE } from "@/data/categories";
import type { HomeContent, HomeTile, L, TileKey } from "./home-types";

/** The home page as designed, before any change in the admin. */
export function homeDefaults(ru: Dictionary, kk: Dictionary): HomeContent {
  const l = (f: (d: Dictionary) => string): L => ({ ru: f(ru), kk: f(kk) });
  const none: L = { ru: "", kk: "" };
  const tile = (t: Omit<HomeTile, "mobile" | "focusMobile"> & { focusMobile?: HomeTile["focus"] }): HomeTile => ({
    ...t,
    mobile: null,
    focusMobile: t.focusMobile ?? t.focus,
  });
  const tiles = {
    newborn: tile({
      title: l((d) => d.home.newbornTitle),
      sub: l((d) => d.home.newbornSub),
      media: { kind: "video", src: "/video/babies.mp4", poster: "/video/babies-poster.jpg" },
      focus: { x: 50, y: 12 },
      link: "/catalog/newborn",
    }),
    toddler: tile({
      title: l((d) => d.home.toddlerTitle),
      sub: l((d) => d.home.toddlerSub),
      media: { kind: "image", src: "/img/covers/deti.jpg" },
      focus: { x: 50, y: 30 },
      link: "/catalog/toddler",
    }),
    discharge: tile({
      title: l((d) => d.home.dischargeTitle),
      sub: l((d) => d.home.dischargeSub),
      media: { kind: "image", src: "/img/covers/vypiska.jpg" },
      focus: { x: 50, y: 50 },
      link: "/catalog/nabory-na-vypisku",
    }),
  } as Record<TileKey, HomeTile>;
  for (const t of homeTiles) {
    tiles[t.key] = tile({
      title: l((d) => d.home.tiles[t.key]),
      sub: none,
      media: { kind: "image", src: t.image },
      focus: { x: 50, y: 0 },
      link: t.categories.length === 1 ? `/catalog/${t.categories[0]}` : `/catalog?category=${t.categories.join(",")}`,
    });
  }
  return {
    tiles,
    store: {
      title: l((d) => d.home.storeTitle),
      address: l((d) => d.home.storeAddress),
      hours: l((d) => d.home.storeHours),
      cta: l((d) => d.home.storeCta),
      map: STORE.map,
    },
    benefits: ru.home.benefits.map((b, i) => ({ title: { ru: b.title, kk: kk.home.benefits[i]?.title ?? "" }, text: { ru: b.text, kk: kk.home.benefits[i]?.text ?? "" } })),
  };
}
