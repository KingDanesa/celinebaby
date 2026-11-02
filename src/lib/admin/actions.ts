"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { getStore, mutateOrder, type OrderStatus } from "@/lib/store";
import { sendStatusEmail } from "@/lib/email";
import { siteUrl } from "@/lib/payment/service";
import { invalidateProducts, loadAllProducts } from "@/lib/products";
import { slugify } from "@/lib/catalog";
import { categorySlugs } from "@/data/categories";
import type { Product } from "@/lib/types";

/* ---------------- products ---------------- */

export interface ProductInput {
  id?: number;
  name: string;
  nameKk?: string;
  sku?: string;
  price: number;
  oldPrice?: number | null;
  category: string;
  gender: "girl" | "boy" | "unisex";
  ages: ("newborn" | "toddler")[];
  brand?: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  images: string[];
  descriptionText: string;
  composition?: string;
  care?: string;
  lining?: string;
  tags: ("new" | "hit" | "sale")[];
  showInNew: boolean;
  inStock: boolean;
  status: "active" | "draft";
}

function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export type SaveResult = { ok: true; id: number } | { ok: false; error: string };

export async function saveProductAction(payload: string): Promise<SaveResult> {
  await requireAdmin();
  let input: ProductInput;
  try {
    input = JSON.parse(payload) as ProductInput;
  } catch {
    return { ok: false, error: "Некорректные данные формы" };
  }

  const name = (input.name ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Укажите название товара" };
  if (!(input.price > 0)) return { ok: false, error: "Цена должна быть больше нуля" };
  if (!categorySlugs.includes(input.category)) return { ok: false, error: "Выберите категорию" };
  if (!["girl", "boy", "unisex"].includes(input.gender)) return { ok: false, error: "Выберите, для кого товар" };
  const ages = (input.ages ?? []).filter((a) => a === "newborn" || a === "toddler");
  if (ages.length === 0) return { ok: false, error: "Отметьте хотя бы один возраст" };
  const images = (input.images ?? []).filter(Boolean);
  if (input.status === "active" && images.length === 0) return { ok: false, error: "Добавьте хотя бы одно фото или сохраните как черновик" };

  const store = await getStore();
  const all = await loadAllProducts();
  const existing = input.id ? all.find((p) => p.id === input.id) : undefined;
  const id = existing?.id ?? (await store.nextProductId());

  let slug = existing?.slug ?? slugify(name) ?? `product-${id}`;
  if (!existing && all.some((p) => p.slug === slug)) slug = `${slug}-${id}`;

  const now = new Date().toISOString();
  const product: Product = {
    id,
    slug,
    sku: (input.sku ?? "").trim(),
    name,
    nameKk: (input.nameKk ?? "").trim() || undefined,
    price: Math.round(input.price),
    oldPrice: input.oldPrice && input.oldPrice > input.price ? Math.round(input.oldPrice) : null,
    category: input.category,
    gender: input.gender,
    ages,
    brand: (input.brand ?? "").trim() || null,
    sizes: (input.sizes ?? []).map((s) => s.trim()).filter(Boolean),
    ageMonths: existing?.ageMonths ?? null,
    colors: (input.colors ?? []).filter((c) => c.name?.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex || "#E5DDD8" })),
    images,
    imagesFull: images.map((u) => existing?.imagesFull?.[existing.images.indexOf(u)] ?? u),
    description: textToHtml(input.descriptionText ?? ""),
    composition: (input.composition ?? "").trim() || null,
    care: (input.care ?? "").trim() || null,
    lining: (input.lining ?? "").trim() || null,
    tags: (input.tags ?? []).filter((t) => t === "hit" || t === "sale"),
    showInNew: !!input.showInNew,
    inStock: !!input.inStock,
    status: input.status === "draft" ? "draft" : "active",
    sourceUrl: existing?.sourceUrl,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await store.saveProduct(product);
  invalidateProducts();
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function deleteProductAction(id: number) {
  await requireAdmin();
  const store = await getStore();
  const p = await store.getProduct(id);
  if (p) {
    for (const url of p.images) {
      if (url.startsWith("/uploads/") || url.includes("/storage/v1/")) await store.deleteImage(url).catch(() => {});
    }
    await store.deleteProduct(id);
  }
  invalidateProducts();
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function toggleProductStatusAction(id: number) {
  await requireAdmin();
  const store = await getStore();
  const p = await store.getProduct(id);
  if (!p) return;
  await store.saveProduct({ ...p, status: p.status === "draft" ? "active" : "draft", updatedAt: new Date().toISOString() });
  invalidateProducts();
  revalidatePath("/", "layout");
}

/* ---------------- orders ---------------- */

const ORDER_STATUSES: OrderStatus[] = ["new", "paid", "shipped", "done", "cancelled"];

export async function setOrderStatusAction(id: string, status: OrderStatus) {
  await requireAdmin();
  if (!ORDER_STATUSES.includes(status)) return;
  const res = await mutateOrder(id, (o) => (o.status === status ? null : { ...o, status }));
  if (res?.changed) sendStatusEmail(res.after, siteUrl()).catch((e) => console.error("[email]", e));
  revalidatePath("/admin/orders", "layout");
}
