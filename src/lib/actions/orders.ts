"use server";

import { getStore, type Order } from "@/lib/store";
import type { CartItem } from "@/lib/types";

export interface PlaceOrderInput {
  items: CartItem[];
  delivery: string;
  payment: string;
  customer: Order["customer"];
  locale: string;
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.items?.length) return { ok: false, error: "empty" };
  if (!input.customer?.name?.trim() || !input.customer?.phone?.trim() || !input.customer?.city?.trim()) {
    return { ok: false, error: "required" };
  }
  const store = await getStore();
  const id = `CB-${Date.now().toString().slice(-6)}`;
  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    status: "new",
    items: input.items.map((i) => ({ ...i, qty: Math.max(1, Math.min(99, Math.round(i.qty))) })),
    subtotal: input.items.reduce((s, i) => s + i.price * i.qty, 0),
    delivery: input.delivery,
    payment: input.payment,
    customer: {
      name: input.customer.name.trim(),
      phone: input.customer.phone.trim(),
      email: input.customer.email?.trim() || undefined,
      city: input.customer.city.trim(),
      address: input.customer.address?.trim() || undefined,
      comment: input.customer.comment?.trim() || undefined,
    },
    locale: input.locale,
  };
  await store.saveOrder(order);
  return { ok: true, id };
}
