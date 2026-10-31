"use server";

import { getStore, type Order } from "@/lib/store";
import type { CartItem } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth/server";
import { sendNewOrderEmails, sendPaidEmails } from "@/lib/email";
import { checkStatus, halykEnabled, isFailedStatus, isPaidStatus, newInvoiceId } from "@/lib/payment/halyk";

export interface PlaceOrderInput {
  items: CartItem[];
  delivery: string;
  payment: string;
  customer: Order["customer"];
  locale: string;
}

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function placeOrder(input: PlaceOrderInput): Promise<{ ok: true; id: string; next: string } | { ok: false; error: string }> {
  if (!input.items?.length) return { ok: false, error: "empty" };
  if (!input.customer?.name?.trim() || !input.customer?.phone?.trim() || !input.customer?.city?.trim()) {
    return { ok: false, error: "required" };
  }
  const user = await getCurrentUser();
  const store = await getStore();
  const id = `CB-${Date.now().toString().slice(-6)}`;
  const online = input.payment === "halyk" && halykEnabled();
  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    status: "new",
    items: input.items.map((i) => ({ ...i, qty: Math.max(1, Math.min(99, Math.round(i.qty))) })),
    subtotal: input.items.reduce((s, i) => s + i.price * i.qty, 0),
    delivery: input.delivery,
    payment: online ? "halyk" : "kaspi",
    paymentStatus: "unpaid",
    invoiceId: online ? newInvoiceId() : undefined,
    customer: {
      name: input.customer.name.trim(),
      phone: input.customer.phone.trim(),
      email: input.customer.email?.trim() || user?.email || undefined,
      city: input.customer.city.trim(),
      address: input.customer.address?.trim() || undefined,
      comment: input.customer.comment?.trim() || undefined,
    },
    userId: user?.id ?? null,
    locale: input.locale,
  };
  await store.saveOrder(order);
  sendNewOrderEmails(order, siteUrl()).catch((e) => console.error("[email]", e));
  const next = online ? `/${input.locale}/pay/${id}` : `/${input.locale}/checkout/success?order=${id}`;
  return { ok: true, id, next };
}

/** Ask the bank about an invoice and update the order accordingly. Safe to call repeatedly. */
export async function syncPaymentStatus(orderId: string): Promise<Order | null> {
  const store = await getStore();
  const order = await store.getOrder(orderId);
  if (!order) return null;
  if (order.payment !== "halyk" || !order.invoiceId || order.paymentStatus === "paid") return order;
  try {
    const res = await checkStatus(order.invoiceId);
    if (!res.ok || !res.transaction) return order;
    const st = res.transaction.statusName;
    if (isPaidStatus(st)) {
      const paid: Order = { ...order, paymentStatus: "paid", status: order.status === "new" ? "paid" : order.status, paidAt: new Date().toISOString(), paymentRef: res.transaction.id };
      await store.saveOrder(paid);
      sendPaidEmails(paid, siteUrl()).catch((e) => console.error("[email]", e));
      return paid;
    }
    if (isFailedStatus(st)) {
      const failed: Order = { ...order, paymentStatus: "failed", paymentRef: res.transaction.id };
      await store.saveOrder(failed);
      return failed;
    }
    if (order.paymentStatus === "unpaid") {
      const pending: Order = { ...order, paymentStatus: "pending" };
      await store.saveOrder(pending);
      return pending;
    }
  } catch (e) {
    console.error("[halyk] status check failed", e);
  }
  return order;
}

/** New invoice for a retry after a failed payment. */
export async function renewInvoice(orderId: string): Promise<Order | null> {
  const store = await getStore();
  const order = await store.getOrder(orderId);
  if (!order || order.paymentStatus === "paid") return order;
  const renewed: Order = { ...order, payment: "halyk", invoiceId: newInvoiceId(), paymentStatus: "unpaid", paymentRef: undefined };
  await store.saveOrder(renewed);
  return renewed;
}
