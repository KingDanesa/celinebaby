/**
 * Catalog taxonomy.
 *
 * A product has exactly one `category` (what it is), one `gender` (who it is for)
 * and one or more `ages` (age group). Navigation and filters are built from these
 * three axes, so adding a product in the future admin only requires picking
 * values from these lists — no manual placement in menus.
 */

export type Gender = "girl" | "boy" | "unisex";
export type AgeGroup = "newborn" | "toddler";

export interface Category {
  slug: string;
  /** Order in menus and on the home page. */
  order: number;
  /** Group used to split the mega-menu into columns. */
  group: "clothes" | "outer" | "sleep" | "accessories" | "sets";
}

export const categories: Category[] = [
  { slug: "nabory-na-vypisku", order: 1, group: "sets" },
  { slug: "bodi-i-slipy", order: 2, group: "clothes" },
  { slug: "rompery", order: 3, group: "clothes" },
  { slug: "kombinezony", order: 4, group: "clothes" },
  { slug: "komplekty", order: 5, group: "clothes" },
  { slug: "bryuki-i-leginsy", order: 6, group: "clothes" },
  { slug: "kardigany-i-svitera", order: 7, group: "clothes" },
  { slug: "platya-i-yubki", order: 8, group: "clothes" },
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
  new: { tag: "new" },
  hits: { tag: "hit" },
  sale: { tag: "sale" },
} as const;

export type PresetSlug = keyof typeof presetRoutes;

export function isPresetSlug(slug: string): slug is PresetSlug {
  return slug in presetRoutes;
}

export const FREE_DELIVERY_FROM = 50000;
