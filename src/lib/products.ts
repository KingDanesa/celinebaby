import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { getStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export const PRODUCTS_TAG = "products";

function normalise(p: Product): Product {
  return {
    ...p,
    status: p.status ?? "active",
    showInNew: p.showInNew ?? false,
    oldPrice: p.oldPrice ?? null,
    brand: p.brand ?? null,
    tags: p.tags ?? [],
    colors: p.colors ?? [],
    sizes: p.sizes ?? [],
    images: p.images ?? [],
    imagesFull: p.imagesFull?.length ? p.imagesFull : (p.images ?? []),
    ages: p.ages?.length ? p.ages : ["newborn"],
  };
}

const loadAll = unstable_cache(
  async () => {
    const store = await getStore();
    const list = await store.listProducts();
    return list.map(normalise);
  },
  ["products-all-v2"],
  // Admin actions invalidate the tag; the timer is a safety net for edits made outside the app (scripts, SQL).
  { tags: [PRODUCTS_TAG], revalidate: 300 },
);

/** All products including drafts (admin). */
export async function loadAllProducts(): Promise<Product[]> {
  return loadAll();
}

/** Products visible on the public site. */
export async function loadProducts(): Promise<Product[]> {
  const all = await loadAll();
  return all.filter((p) => p.status !== "draft");
}

export async function findProduct(slug: string): Promise<Product | undefined> {
  const all = await loadProducts();
  return all.find((p) => p.slug === slug);
}

export function invalidateProducts() {
  revalidateTag(PRODUCTS_TAG, { expire: 0 });
}
