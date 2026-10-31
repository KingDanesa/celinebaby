/**
 * Catalog taxonomy (see Celine_Baby_struktura.docx).
 *
 * Three axes: gender ("Для кого") → age group → category of clothes.
 * A product has exactly one `category`, one `gender` and one or more `ages`.
 * Navigation and filters are built from these axes, so adding a product in the
 * admin only requires picking values from these lists.
 */

export type Gender = "girl" | "boy" | "unisex";
export type AgeGroup = "newborn" | "toddler";

export interface Category {
  slug: string;
  /** Order in menus and on the home page. */
  order: number;
  /** Group used to split the mega-menu into columns. */
  group: "clothes" | "outer" | "sleep" | "accessories" | "sets";
  /** Categories that exist only for a particular gender (e.g. dresses). */
  genders?: Gender[];
}

export const categories: Category[] = [
  { slug: "nabory-na-vypisku", order: 1, group: "sets" },
  { slug: "bodi-i-slipy", order: 2, group: "clothes" },
  { slug: "rompery", order: 3, group: "clothes" },
  { slug: "kombinezony", order: 4, group: "clothes" },
  { slug: "komplekty", order: 5, group: "clothes" },
  { slug: "bryuki-i-leginsy", order: 6, group: "clothes" },
  { slug: "kardigany-i-svitera", order: 7, group: "clothes" },
  { slug: "platya-i-yubki", order: 8, group: "clothes", genders: ["girl"] },
  { slug: "rubashki-i-futbolki", order: 9, group: "clothes" },
  { slug: "verhnyaya-odezhda", order: 10, group: "outer" },
  { slug: "konverty", order: 11, group: "sleep" },
  { slug: "pledy-i-pelenki", order: 12, group: "sleep" },
  { slug: "shapki-i-snudy", order: 13, group: "accessories" },
  { slug: "aksessuary", order: 14, group: "accessories" },
];

export const categorySlugs = categories.map((c) => c.slug);

export function isCategorySlug(slug: string): boolean {
  return categorySlugs.includes(slug);
}

/** Reserved catalog routes that are not categories but preset filters. */
export const presetRoutes = {
  girls: { gender: "girl" },
  boys: { gender: "boy" },
  newborn: { age: "newborn" },
  toddler: { age: "toddler" },
  new: { onlyNew: true },
  hits: { tag: "hit" },
  sale: { tag: "sale" },
} as const;

export type PresetSlug = keyof typeof presetRoutes;

export function isPresetSlug(slug: string): slug is PresetSlug {
  return slug in presetRoutes;
}

/** Home page tiles: each opens the catalog with one or several categories. */
export const homeTiles = [
  { key: "outer", categories: ["verhnyaya-odezhda"], image: "/img/covers/verhnyaya-odezhda.jpg", tone: "blue" },
  { key: "bodysuits", categories: ["bodi-i-slipy"], image: "/img/covers/bodi-i-slipy.jpg", tone: "pink" },
  { key: "sets", categories: ["komplekty"], image: "/img/covers/kardigany-i-kostyumy.jpg", tone: "cream" },
  { key: "hats", categories: ["shapki-i-snudy", "aksessuary"], image: "/img/covers/shapki-i-aksessuary.jpg", tone: "mint" },
] as const;

export const FREE_DELIVERY_FROM = 50000;
export const NEW_SLIDER_LIMIT = 10;

export const STORE = {
  address: "Астана, ул. Туркестан 16/5",
  hours: "10:00–19:00",
  phone: "+7 (701) 815 96 63",
  phoneRaw: "77018159663",
  email: "celinebabykazakhstan@gmail.com",
  instagram: "https://www.instagram.com/celinebaby__kz",
  tiktok: "https://www.tiktok.com/@celinebaby__kz",
  whatsapp: "https://wa.me/77018159663",
  map: "https://2gis.kz/astana/search/%D0%A2%D1%83%D1%80%D0%BA%D0%B5%D1%81%D1%82%D0%B0%D0%BD%2016%2F5",
};
