import type { Product } from "@/lib/types";
import {
  categories,
  isCategorySlug,
  isPresetSlug,
  presetRoutes,
  type AgeGroup,
  type Gender,
} from "@/data/categories";

/* ------------------------------------------------------------------ */
/*  Pure helpers. The product list is loaded via `loadProducts()` in    */
/*  `@/lib/products` (server only) and passed in explicitly.            */
/* ------------------------------------------------------------------ */

export interface CatalogQuery {
  category?: string;
  /** Several categories at once (home page tiles such as "Кардиганы // Костюмы"). */
  categories?: string[];
  /** Only products flagged "В новинки" in admin. */
  onlyNew?: boolean;
  gender?: Gender;
  age?: AgeGroup;
  sizes?: string[];
  colors?: string[];
  priceMin?: number;
  priceMax?: number;
  tag?: "new" | "hit" | "sale";
  q?: string;
  sort?: "new" | "popular" | "price-asc" | "price-desc";
}

export function parseQuery(
  slug: string | undefined,
  sp: Record<string, string | string[] | undefined>,
): CatalogQuery {
  const q: CatalogQuery = {};
  if (slug) {
    if (isCategorySlug(slug)) q.category = slug;
    else if (isPresetSlug(slug)) Object.assign(q, presetRoutes[slug]);
  }
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const many = (k: string) => {
    const v = sp[k];
    if (!v) return [];
    return (Array.isArray(v) ? v : v.split(",")).filter(Boolean);
  };
  const g = one("gender");
  if (g === "girl" || g === "boy" || g === "unisex") q.gender = g;
  const a = one("age");
  if (a === "newborn" || a === "toddler") q.age = a;
  const cats = many("category").filter(isCategorySlug);
  if (cats.length === 1) q.category = cats[0];
  else if (cats.length > 1) q.categories = cats;
  const t = one("tag");
  if (t === "new" || t === "hit" || t === "sale") q.tag = t;
  const sizes = many("size");
  if (sizes.length) q.sizes = sizes;
  const colors = many("color");
  if (colors.length) q.colors = colors;
  const pmin = Number(one("min"));
  if (pmin > 0) q.priceMin = pmin;
  const pmax = Number(one("max"));
  if (pmax > 0) q.priceMax = pmax;
  const s = one("sort");
  if (s === "new" || s === "popular" || s === "price-asc" || s === "price-desc") q.sort = s;
  const search = one("q");
  if (search && search.trim()) q.q = search.trim();
  return q;
}

function colorKey(name: string) {
  return name.toLowerCase().split(/[-/]/)[0].trim();
}

export function filterProducts(products: Product[], q: CatalogQuery): Product[] {
  let list = products;
  if (q.category) list = list.filter((p) => p.category === q.category);
  if (q.categories?.length) list = list.filter((p) => q.categories!.includes(p.category));
  if (q.onlyNew) list = list.filter((p) => p.showInNew);
  if (q.gender) {
    list = list.filter((p) =>
      q.gender === "unisex" ? p.gender === "unisex" : p.gender === q.gender || p.gender === "unisex",
    );
  }
  if (q.age) list = list.filter((p) => p.ages.includes(q.age!));
  if (q.tag) list = list.filter((p) => p.tags.includes(q.tag!));
  if (q.sizes?.length) list = list.filter((p) => p.sizes.some((s) => q.sizes!.includes(s)));
  if (q.colors?.length) {
    const wanted = q.colors.map((c) => c.toLowerCase());
    list = list.filter((p) => p.colors.some((c) => wanted.includes(colorKey(c.name))));
  }
  if (q.priceMin) list = list.filter((p) => p.price >= q.priceMin!);
  if (q.priceMax) list = list.filter((p) => p.price <= q.priceMax!);
  if (q.q) {
    const words = q.q.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((p) => {
      const hay = `${p.name} ${p.sku} ${p.brand ?? ""} ${p.colors.map((c) => c.name).join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }
  const sort = q.sort ?? "popular";
  const sorted = [...list];
  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "new":
      sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || b.id - a.id);
      break;
    default: {
      const score = (p: Product) =>
        (p.tags.includes("hit") ? 100 : 0) + (p.showInNew ? 20 : 0) + (p.images.length > 2 ? 5 : 0);
      sorted.sort((a, b) => score(b) - score(a) || b.id - a.id);
    }
  }
  return sorted;
}

/** Sizes in a sensible display order: by month range, then cm, then the rest. */
export const SIZE_ORDER = [
  "0-1 мес", "0-3 мес", "1-3 мес", "0-6 мес", "3-6 мес", "6-9 мес", "6-12 мес", "9-12 мес",
  "12-18 мес", "12-24 мес", "18-24 мес", "24-36 мес", "1-2 года", "2-3 года", "3 года", "3-4 года",
  "50", "56", "62", "68", "74", "80", "86", "92", "98", "104", "110",
  "40/42", "42/44", "44/46", "46/48", "48/50",
];
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "ru");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export interface Facets {
  sizes: { value: string; count: number }[];
  colors: { value: string; hex: string; count: number }[];
  priceMin: number;
  priceMax: number;
  categories: { slug: string; count: number }[];
}

/** Facets are computed over the base scope (category/preset/search) so that
 *  users still see all the options while narrowing down. */
export function computeFacets(products: Product[], q: CatalogQuery): Facets {
  const base = filterProducts(products, { category: q.category, categories: q.categories, onlyNew: q.onlyNew, tag: q.tag, q: q.q, gender: q.gender, age: q.age });
  const sizeCount = new Map<string, number>();
  const colorCount = new Map<string, { hex: string; count: number }>();
  const catCount = new Map<string, number>();
  let min = Infinity;
  let max = 0;
  for (const p of base) {
    for (const s of p.sizes) sizeCount.set(s, (sizeCount.get(s) ?? 0) + 1);
    for (const c of p.colors) {
      const k = colorKey(c.name);
      const cur = colorCount.get(k);
      if (cur) cur.count++;
      else colorCount.set(k, { hex: c.hex, count: 1 });
    }
    catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
    if (p.price < min) min = p.price;
    if (p.price > max) max = p.price;
  }
  const sizes = sortSizes([...sizeCount.keys()])
    .filter((s) => (sizeCount.get(s) ?? 0) >= 2 || sizeCount.size < 12)
    .map((s) => ({ value: s, count: sizeCount.get(s)! }));
  const colors = [...colorCount.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 14)
    .map(([value, v]) => ({ value, hex: v.hex, count: v.count }));
  return {
    sizes,
    colors,
    priceMin: min === Infinity ? 0 : min,
    priceMax: max,
    categories: categories
      .map((c) => ({ slug: c.slug, count: catCount.get(c.slug) ?? 0 }))
      .filter((c) => c.count > 0),
  };
}

export function relatedProducts(products: Product[], p: Product, n = 8): Product[] {
  const same = products.filter((x) => x.id !== p.id && x.category === p.category);
  const pref = same.filter((x) => x.gender === p.gender || x.gender === "unisex");
  const pool = pref.length >= n ? pref : same;
  const seed = p.id;
  return [...pool]
    .map((x, i) => ({ x, k: ((i + 1) * 9301 + seed * 49297) % 233280 }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((v) => v.x);
}

export function categoryCover(products: Product[], slug: string): Product | undefined {
  const list = products.filter((p) => p.category === slug);
  return list.find((p) => p.tags.includes("hit") && p.images.length > 1) ?? list.find((p) => p.images.length > 1) ?? list[0];
}

export function categoryCount(products: Product[], slug: string): number {
  return products.filter((p) => p.category === slug).length;
}

export function getHits(products: Product[]): Product[] {
  return products.filter((p) => p.tags.includes("hit"));
}

/** Products flagged "В новинки" in admin, most recently updated first. */
export function getNewArrivals(products: Product[], n = 10): Product[] {
  return products
    .filter((p) => p.showInNew)
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || b.id - a.id)
    .slice(0, n);
}

export function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "j", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "shch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", ә: "a", ғ: "g", қ: "q", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
  };
  return input
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
