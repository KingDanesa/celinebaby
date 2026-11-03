/**
 * Editable home page blocks (/admin/home). Shared by the site, the admin form and the server.
 * Only what the owner changed is stored (app_meta "home"); everything else comes from home-defaults.ts.
 */
export type L = { ru: string; kk: string };

export interface Media {
  kind: "image" | "video";
  src: string;
  /** First frame of a video, shown while it loads. */
  poster?: string;
}

/** Point of the photo/video that must stay visible when it is cropped, in % from the left and top. */
export interface Focus {
  x: number;
  y: number;
}

export interface HomeTile {
  title: L;
  sub: L;
  media: Media;
  /** Separate photo/video for phones; null = the same as on a computer. */
  mobile: Media | null;
  focus: Focus;
  focusMobile: Focus;
  link: string;
}

export interface StoreBlock {
  title: L;
  address: L;
  hours: L;
  cta: L;
  map: string;
}

export interface Benefit {
  title: L;
  text: L;
}

export const TILE_KEYS = ["newborn", "toddler", "outer", "bodysuits", "sets", "hats", "discharge"] as const;
export type TileKey = (typeof TILE_KEYS)[number];
export type BlockKey = TileKey | "store" | "benefits";

export interface HomeContent {
  tiles: Record<TileKey, HomeTile>;
  store: StoreBlock;
  benefits: Benefit[];
}

/** Saved overrides: a block is either stored in full or not at all (= default). */
export type HomeOverrides = Partial<{ [K in TileKey]: HomeTile } & { store: StoreBlock; benefits: Benefit[] }>;

export const BLOCK_NAMES: Record<BlockKey, string> = {
  newborn: "Большой блок слева — «Малыши»",
  toddler: "Большой блок справа — «Дети»",
  outer: "Плитка 1 — «Верхняя одежда»",
  bodysuits: "Плитка 2 — «Боди и слипы»",
  sets: "Плитка 3 — «Костюмы и комплекты»",
  hats: "Плитка 4 — «Шапки и аксессуары»",
  discharge: "Блок «Наборы на выписку»",
  store: "Блок «Магазин в Астане»",
  benefits: "Строка преимуществ",
};

/** Blocks with a line under the title. */
export const HAS_SUB: TileKey[] = ["newborn", "toddler", "discharge"];

export const pick = (l: L, locale: string) => ((locale === "kk" && l.kk.trim()) || l.ru).trim();
