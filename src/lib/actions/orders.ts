"use server";

import { getStore, type Order } from "@/lib/store";
import type { CartItem } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth/server";
import { sendNewOrderEmails } from "@/lib/email";
import { halykEnabled } from "@/lib/payment/halyk";
import { siteUrl } from "@/lib/payment/service";
import { loadProducts } from "@/lib/products";

export interface PlaceOrderInput {
  items: CartItem[];
  delivery: string;
  payment: string;
  customer: Order["customer"];
  locale: string;
}

const clip = (s: string | undefined, n: number) => (s ?? "").trim().slice(0, n);

export async function placeOrder(input: PlaceOrderInput): Promise<{ ok: true; id: string; next: string } | { ok: false; error: string }> {
  if (!input.items?.length || input.items.length > 100) return { ok: false, error: "empty" };
  if (!input.customer?.name?.trim() || !input.customer?.phone?.trim() || !input.customer?.city?.trim()) {
    return { ok: false, error: "required" };
  }

  // Prices come from the catalogue, never from the browser.
  const products = await loadProducts();
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: CartItem[] = [];
  for (const i of input.items) {
    const p = byId.get(Number(i.productId));
    if (!p || p.inStock === false) return { ok: false, error: "unavailable" };
    items.push({ ...i, name: p.name, slug: p.slug, price: p.price, qty: Math.max(1, Math.min(99, Math.round(Number(i.qty) || 1))) });
  }

  const user = await getCurrentUser();
  const store = await getStore();
  const online = input.payment === "halyk" && halykEnabled();
  const base: Omit<Order, "id"> = {
    createdAt: new Date().toISOString(),
    status: "new",
    items,
    subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
    delivery: clip(input.delivery, 40),
    payment: online ? "halyk" : "kaspi",
    paymentStatus: "unpaid",
    customer: {
      name: clip(input.customer.name, 120),
      phone: clip(input.customer.phone, 40),
      email: clip(input.customer.email, 120) || user?.email || undefined,
      city: clip(input.customer.city, 80),
      address: clip(input.customer.address, 300) || undefined,
      comment: clip(input.customer.comment, 1000) || undefined,
    },
    userId: user?.id ?? null,
    locale: input.locale === "kk" ? "kk" : "ru",
  };

  let order: Order | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const id = `CB-${Date.now().toString().slice(-6)}${attempt ? String(attempt) : ""}`;
    try {
      order = await store.createOrder({ ...base, id });
    } catch (e) {
      if (attempt === 4) throw e;
    }
  }
  if (!order) return { ok: false, error: "failed" };
  sendNewOrderEmails(order, siteUrl()).catch((e) => console.error("[email]", e));
  const next = online ? `/${base.locale}/pay/${order.id}` : `/${base.locale}/checkout/success?order=${order.id}`;
  return { ok: true, id: order.id, next };
}
