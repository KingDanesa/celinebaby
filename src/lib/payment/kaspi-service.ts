import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { getStore, mutateOrder, type HalykState, type Order, type PaymentAttempt } from "@/lib/store";
import { siteUrl } from "@/lib/site";
import { generateSecretHash, newInvoiceId } from "./halyk";
import { attemptOf, FAILED, latest, PENDING, updateAttempt } from "./service";
import { kaspiConfig, kaspiCreatePayment, kaspiGetStatus, kaspiOnlineEnabled, type KaspiStatus } from "./kaspi";

/**
 * Order-level logic for Kaspi online payments. Same rules as for Halyk:
 * each attempt has its own id and secret, the callback is only a hint,
 * the state is always re-read from Kaspi, and paid e-mails go out exactly once.
 */

const now = () => new Date().toISOString();
const log = (m: string) => console.log(`[kaspi] ${m}`.slice(0, 1000));

const STATE: Record<KaspiStatus, HalykState> = { pending: "PENDING", paid: "CHARGE", failed: "FAILED", refunded: "REFUND" };

/** Signature that goes into our callback URL, so nobody else can trigger status checks for an order. */
export function callbackSignature(a: PaymentAttempt): string {
  return createHmac("sha256", a.secretHash).update(a.invoiceId).digest("hex").slice(0, 32);
}

export function kaspiCallbackUrl(a: PaymentAttempt): string {
  return `${siteUrl()}/api/payment/kaspi/callback?inv=${a.invoiceId}&sig=${callbackSignature(a)}`;
}

export function checkCallbackSignature(a: PaymentAttempt, sig: string): boolean {
  const want = Buffer.from(callbackSignature(a));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

async function applyKaspiStatus(orderId: string, invoiceId: string, status: KaspiStatus) {
  const state = STATE[status];
  await updateAttempt(orderId, invoiceId, (a) => {
    if (a.state === state) return false;
    if (a.state === "CHARGE" && state !== "REFUND") return false; // never step back from paid
    a.state = state;
    if (state === "CHARGE" && a.externalId) a.halykId = a.externalId; // used as the order's payment reference
    return true;
  });
}

/** Re-checks one attempt with Kaspi. */
export async function reconcileKaspi(orderId: string, invoiceId: string): Promise<boolean> {
  const order = await (await getStore()).getOrder(orderId);
  const a = order ? attemptOf(order, invoiceId) : undefined;
  if (!a || a.provider !== "kaspi" || !a.externalId) return false;
  const res = await kaspiGetStatus(a.externalId, a.invoiceId).catch((e) => {
    log(`status failed for ${invoiceId}: ${e instanceof Error ? e.message : e}`);
    return null;
  });
  if (!res) return false;
  if (res.status === "paid" && res.amount !== undefined && Math.round(res.amount * 100) !== a.amountMinor) {
    log(`amount mismatch for ${invoiceId}: ${res.amount}`);
    return false;
  }
  await applyKaspiStatus(orderId, invoiceId, res.status);
  return true;
}

export async function syncKaspi(orderId: string): Promise<Order | null> {
  const store = await getStore();
  const order = await store.getOrder(orderId);
  if (!order || !order.payments?.length || !kaspiOnlineEnabled()) return order;
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") return order;
  for (const a of order.payments.filter((p) => p.provider === "kaspi" && !FAILED.includes(p.state) && p.state !== "CHARGE")) {
    await reconcileKaspi(orderId, a.invoiceId);
  }
  return store.getOrder(orderId);
}

export type PreparedKaspi =
  | { kind: "notfound" }
  | { kind: "paid"; order: Order }
  | { kind: "unavailable"; order: Order }
  | { kind: "redirect"; order: Order; url: string };

/** Pay page for a Kaspi order: reuse a fresh attempt or create one, then send the customer to Kaspi. */
export async function prepareKaspiPayment(orderId: string, locale: string): Promise<PreparedKaspi> {
  const store = await getStore();
  let order = await store.getOrder(orderId);
  if (!order) return { kind: "notfound" };
  if (!kaspiOnlineEnabled()) return { kind: "unavailable", order };
  order = (await syncKaspi(orderId)) ?? order;
  if (order.paymentStatus === "paid") return { kind: "paid", order };

  const open = latest(order);
  if (open?.provider === "kaspi" && PENDING.includes(open.state) && open.redirectUrl && open.amountMinor === order.subtotal * 100) {
    return { kind: "redirect", order, url: open.redirectUrl };
  }

  const cfg = kaspiConfig();
  const t = now();
  const attempt: PaymentAttempt = {
    provider: "kaspi",
    invoiceId: newInvoiceId(),
    secretHash: generateSecretHash(),
    amountMinor: order.subtotal * 100,
    currency: "KZT",
    terminal: cfg.merchantId,
    test: cfg.test,
    state: "CREATED",
    createdAt: t,
    updatedAt: t,
  };
  try {
    const created = await kaspiCreatePayment({
      invoiceId: attempt.invoiceId,
      orderId,
      amount: order.subtotal,
      description: `Celine Baby, заказ ${orderId}`,
      phone: order.customer.phone.replace(/\D/g, ""),
      returnUrl: `${siteUrl()}/${locale}/checkout/success?order=${orderId}`,
      callbackUrl: kaspiCallbackUrl(attempt),
    });
    attempt.externalId = created.externalId;
    attempt.redirectUrl = created.redirectUrl;
    attempt.state = "PENDING";
  } catch (e) {
    log(`create failed for ${orderId}: ${e instanceof Error ? e.message : e}`);
    attempt.state = "ERROR";
    attempt.lastError = (e instanceof Error ? e.message : String(e)).slice(0, 255);
  }
  const res = await mutateOrder(orderId, (o) => {
    for (const p of o.payments ?? []) if (PENDING.includes(p.state)) p.state = "CANCEL";
    o.payments = [...(o.payments ?? []), attempt];
    o.invoiceId = attempt.invoiceId;
    o.paymentStatus = attempt.state === "PENDING" ? "pending" : "failed";
    return o;
  });
  const after = res?.after ?? order;
  return attempt.redirectUrl ? { kind: "redirect", order: after, url: attempt.redirectUrl } : { kind: "unavailable", order: after };
}
