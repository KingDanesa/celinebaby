import "server-only";
import { getStore, mutateOrder, type HalykState, type Order, type PaymentAttempt, type PaymentStatus } from "@/lib/store";
import { sendPaidEmails } from "@/lib/email";
import { siteUrl } from "@/lib/site";
import {
  amountToMinor,
  generateSecretHash,
  halykConfig,
  halykEnabled,
  invoiceToken,
  newInvoiceId,
  requestCharge,
  requestStatus,
  type HalykAuth,
  type HalykTransaction,
} from "./halyk";

/**
 * Order-level payment logic, ported from the old site's ControllerExtensionPaymentHbepay:
 *  - every attempt has its own invoice id and secret_hash;
 *  - the bank's callback must carry the secret_hash, amount, currency and terminal of the attempt;
 *  - the state is always re-read from the bank's status API and checked field by field;
 *  - AUTH (money blocked) is charged with POST /operation/{id}/charge under a claim,
 *    so two parallel requests never charge twice, then we wait for CHARGE.
 */

export const PENDING: HalykState[] = ["CREATED", "PENDING", "NEW", "FINGERPRINT", "VERIFIED"];
export const FAILED: HalykState[] = ["FAILED", "REJECT", "3D", "CANCEL", "CANCEL_OLD", "ERROR"];
const KNOWN: HalykState[] = [...PENDING, "AUTH", "CAPTURING", "CHARGE", "REFUND", ...FAILED];
const STALE_CLAIM_MS = 2 * 60 * 1000;

export { siteUrl };
export const callbackUrl = () => `${siteUrl()}/api/payment/halyk/callback`;

const log = (msg: string) => console.log(`[halyk] ${msg.replace(/[\r\n]+/g, " ").slice(0, 1000)}`);
const now = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------------- state helpers ---------------- */

function derivePaymentStatus(o: Order): PaymentStatus {
  const ps = o.payments ?? [];
  if (!ps.length) return o.paymentStatus === "paid" ? "paid" : "unpaid";
  if (ps.some((p) => p.state === "CHARGE")) return "paid";
  if (ps.some((p) => p.state === "REFUND")) return "refunded";
  if (ps.some((p) => p.state === "AUTH" || p.state === "CAPTURING")) return "authorized";
  const last = ps[ps.length - 1];
  if (FAILED.includes(last.state)) return "failed";
  return last.state === "CREATED" ? "unpaid" : "pending";
}

function settle(o: Order): Order {
  const was = o.paymentStatus;
  o.paymentStatus = derivePaymentStatus(o);
  if (o.paymentStatus === "paid" && was !== "paid") {
    const charged = o.payments?.find((p) => p.state === "CHARGE");
    o.paidAt = now();
    o.paymentRef = charged?.halykId ?? o.paymentRef;
    if (o.status === "new") o.status = "paid";
  }
  return o;
}

export function attemptOf(o: Order, invoiceId: string): PaymentAttempt | undefined {
  return o.payments?.find((p) => p.invoiceId === invoiceId);
}

export function latest(o: Order): PaymentAttempt | undefined {
  return o.payments?.[o.payments.length - 1];
}

type Change = (a: PaymentAttempt, o: Order) => boolean;

/** Changes one attempt under the order's optimistic lock; `fn` returns false to leave it untouched. */
export async function updateAttempt(orderId: string, invoiceId: string, fn: Change) {
  const res = await mutateOrder(orderId, (o) => {
    const a = attemptOf(o, invoiceId);
    if (!a || !fn(a, o)) return null;
    a.updatedAt = now();
    return settle(o);
  });
  if (res?.changed && res.before.paymentStatus !== "paid" && res.after.paymentStatus === "paid") {
    log(`order ${orderId} paid, invoice ${invoiceId}`);
    sendPaidEmails(res.after, siteUrl()).catch((e) => console.error("[email]", e));
  }
  return res;
}

/* ---------------- talking to the bank ---------------- */

type Verified = { ok: true; status: HalykState; tx: HalykTransaction | null } | { ok: false };

async function verifiedStatus(a: PaymentAttempt, allowReject: boolean): Promise<Verified> {
  const res = await requestStatus(a.invoiceId, a.terminal, a.test);
  if (!res.ok || !res.data) {
    log(`status check failed, invoice ${a.invoiceId}, HTTP ${res.status}, ${res.error}`);
    return { ok: false };
  }
  const code = String(res.data.resultCode ?? "missing");
  if (code === "101" && allowReject) return { ok: true, status: "REJECT", tx: null };
  const tx = res.data.transaction;
  if (code !== "100" || !tx) {
    if (code !== "102") log(`status check rejected, invoice ${a.invoiceId}, resultCode ${code}`);
    return { ok: false };
  }
  const invoice = String(tx.invoiceID ?? tx.invoiceId ?? "");
  const terminal = String(tx.terminalID ?? tx.terminalId ?? "");
  if (
    invoice !== a.invoiceId ||
    amountToMinor(tx.amount) !== a.amountMinor ||
    String(tx.currency ?? "").toUpperCase() !== a.currency ||
    terminal !== a.terminal
  ) {
    log(`status fields mismatch, invoice ${a.invoiceId}`);
    return { ok: false };
  }
  return { ok: true, status: String(tx.statusName ?? "").toUpperCase() as HalykState, tx };
}

async function applyStatus(orderId: string, invoiceId: string, status: HalykState, tx: HalykTransaction | null) {
  if (!KNOWN.includes(status)) {
    log(`unknown status ${status.slice(0, 32)}, invoice ${invoiceId}`);
    return { ok: false as const, status };
  }
  await updateAttempt(orderId, invoiceId, (a) => {
    const same = a.state === status && (!tx?.id || a.halykId === tx.id);
    if (same) return false;
    a.state = status;
    if (tx?.id) a.halykId = String(tx.id);
    if (tx?.reference) a.reference = String(tx.reference);
    if (tx?.cardMask) a.cardMask = String(tx.cardMask);
    a.lastError = undefined;
    return true;
  });
  return { ok: true as const, status };
}

async function waitForCharge(orderId: string, a: PaymentAttempt) {
  let last: HalykState = "CAPTURING";
  for (let i = 0; i < 4; i++) {
    if (i > 0) await sleep(900);
    const order = await (await getStore()).getOrder(orderId);
    if (order && attemptOf(order, a.invoiceId)?.state === "CHARGE") return { ok: true as const, status: "CHARGE" as HalykState };
    const v = await verifiedStatus(a, false);
    if (!v.ok) continue;
    last = v.status;
    if (last === "CHARGE" || [...FAILED, "REFUND"].includes(last)) return applyStatus(orderId, a.invoiceId, last, v.tx);
    if (!["AUTH", "NEW", "FINGERPRINT", "VERIFIED", "CAPTURING"].includes(last)) {
      log(`unknown status while waiting for charge, invoice ${a.invoiceId}, ${last.slice(0, 32)}`);
      return { ok: false as const, status: last };
    }
  }
  return { ok: false as const, status: last };
}

async function capture(orderId: string, invoiceId: string, tx: HalykTransaction | null) {
  const halykId = tx?.id ? String(tx.id) : "";
  if (!halykId) {
    log(`AUTH cannot be charged: transaction id missing, invoice ${invoiceId}`);
    return { ok: false as const, status: "AUTH" as HalykState };
  }
  // Record the authorisation (unless a charge is already running or done).
  const rec = await updateAttempt(orderId, invoiceId, (a) => {
    if (["CAPTURING", "CHARGE", "REFUND"].includes(a.state)) return false;
    if (a.state === "AUTH" && a.halykId === halykId) return false;
    a.state = "AUTH";
    a.halykId = halykId;
    if (tx?.reference) a.reference = String(tx.reference);
    if (tx?.cardMask) a.cardMask = String(tx.cardMask);
    a.lastError = undefined;
    return true;
  });
  const current = rec ? attemptOf(rec.after, invoiceId) : undefined;
  if (!current) return { ok: false as const, status: "AUTH" as HalykState };
  if (current.state === "CHARGE") return { ok: true as const, status: "CHARGE" as HalykState };
  if (current.state === "CAPTURING") return waitForCharge(orderId, current);

  // Claim the charge: only the request that moves AUTH → CAPTURING may call the bank.
  const claim = await updateAttempt(orderId, invoiceId, (a) => {
    if (a.state !== "AUTH") return false;
    a.state = "CAPTURING";
    return true;
  });
  if (!claim?.changed) {
    const again = claim ? attemptOf(claim.after, invoiceId) : undefined;
    if (again?.state === "CHARGE") return { ok: true as const, status: "CHARGE" as HalykState };
    if (again?.state === "CAPTURING") return waitForCharge(orderId, again);
    return { ok: false as const, status: (again?.state ?? "AUTH") as HalykState };
  }
  const claimed = attemptOf(claim.after, invoiceId)!;

  const charge = await requestCharge(halykId, claimed.terminal, claimed.test);
  if (!charge.ok) {
    await releaseClaim(orderId, invoiceId, `Charge request failed (HTTP ${charge.status}, ${charge.error})`);
    log(`full charge request failed, invoice ${invoiceId}, HTTP ${charge.status}, ${charge.error}`);
    return { ok: false as const, status: "AUTH" as HalykState };
  }
  const result = await waitForCharge(orderId, claimed);
  if (result.ok) return result;
  await releaseClaim(orderId, invoiceId, "Full charge not confirmed by status API");
  log(`full charge not confirmed as CHARGE, invoice ${invoiceId}, status ${result.status}`);
  return { ok: false as const, status: (result.status === "CHARGE" ? "CHARGE" : "AUTH") as HalykState };
}

function releaseClaim(orderId: string, invoiceId: string, message: string, onlyIfStale = false) {
  return updateAttempt(orderId, invoiceId, (a) => {
    if (a.state !== "CAPTURING") return false;
    if (onlyIfStale && Date.now() - Date.parse(a.updatedAt) < STALE_CLAIM_MS) return false;
    a.state = "AUTH";
    a.lastError = message.slice(0, 255);
    return true;
  });
}

/**
 * Brings one attempt in line with the bank. `allowReject` only for the bank's own callback
 * (resultCode 101 there means the payment was declined).
 */
export async function reconcile(orderId: string, invoiceId: string, allowReject = false) {
  await releaseClaim(orderId, invoiceId, "Stale charge claim released", true);
  const order = await (await getStore()).getOrder(orderId);
  const a = order ? attemptOf(order, invoiceId) : undefined;
  if (!a) return { ok: false as const, status: "" };
  const v = await verifiedStatus(a, allowReject);
  if (!v.ok) return { ok: false as const, status: "" };
  if (v.status === "AUTH") return capture(orderId, invoiceId, v.tx);
  return applyStatus(orderId, invoiceId, v.status, v.tx);
}

/** Re-checks every attempt that may still change (used by return pages, account page and the timer). */
export async function syncPayment(orderId: string): Promise<Order | null> {
  const store = await getStore();
  const order = await store.getOrder(orderId);
  if (order?.payment === "kaspi_online") return (await import("./kaspi-service")).syncKaspi(orderId);
  if (!order || order.payment !== "halyk" || !order.payments?.length || !halykEnabled()) return order;
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") return order;
  const open = order.payments.filter((p) => !FAILED.includes(p.state) && p.state !== "CHARGE" && p.state !== "REFUND");
  for (const a of open) {
    try {
      await reconcile(orderId, a.invoiceId);
    } catch (e) {
      console.error("[halyk] reconcile failed", e);
    }
  }
  return store.getOrder(orderId);
}

/* ---------------- starting a payment ---------------- */

export type PreparedPayment =
  | { kind: "notfound" }
  | { kind: "paid"; order: Order }
  | { kind: "processing"; order: Order }
  | { kind: "unavailable"; order: Order; error?: string }
  | { kind: "pay"; order: Order; attempt: PaymentAttempt; auth: HalykAuth; paymentJs: string; test: boolean };

function reusable(a: PaymentAttempt | undefined, o: Order, terminal: string, test: boolean): a is PaymentAttempt {
  return !!a && PENDING.includes(a.state) && a.terminal === terminal && a.test === test && a.amountMinor === o.subtotal * 100;
}

async function ensureAttempt(orderId: string, fresh: boolean): Promise<{ order: Order; attempt: PaymentAttempt } | null> {
  const cfg = halykConfig();
  const res = await mutateOrder(orderId, (o) => {
    if (!fresh && reusable(latest(o), o, cfg.terminal, cfg.test)) return null;
    const t = now();
    const a: PaymentAttempt = {
      invoiceId: newInvoiceId(),
      secretHash: generateSecretHash(),
      amountMinor: o.subtotal * 100,
      currency: "KZT",
      terminal: cfg.terminal,
      test: cfg.test,
      state: "CREATED",
      createdAt: t,
      updatedAt: t,
    };
    // A fresh attempt replaces a stuck pending one; the old invoice is closed on our side.
    for (const p of o.payments ?? []) if (PENDING.includes(p.state)) p.state = "CANCEL";
    o.payments = [...(o.payments ?? []), a];
    o.invoiceId = a.invoiceId;
    o.payment = "halyk";
    return settle(o);
  });
  if (!res) return null;
  const attempt = latest(res.after);
  return attempt ? { order: res.after, attempt } : null;
}

export async function preparePayment(orderId: string): Promise<PreparedPayment> {
  const store = await getStore();
  let order = await store.getOrder(orderId);
  if (!order) return { kind: "notfound" };
  if (order.payment !== "halyk") return { kind: "unavailable", order };
  if (!halykEnabled()) return { kind: "unavailable", order };

  order = (await syncPayment(orderId)) ?? order;
  if (order.paymentStatus === "paid") return { kind: "paid", order };
  if (order.paymentStatus === "authorized" || order.paymentStatus === "refunded") return { kind: "processing", order };

  const cfg = halykConfig();
  for (const fresh of [false, true]) {
    const ready = await ensureAttempt(orderId, fresh);
    if (!ready) return { kind: "notfound" };
    const { attempt } = ready;
    const token = await invoiceToken({
      invoiceId: attempt.invoiceId,
      secretHash: attempt.secretHash,
      amountMinor: attempt.amountMinor,
      terminal: attempt.terminal,
      postLink: callbackUrl(),
      failurePostLink: callbackUrl(),
      test: attempt.test,
    });
    if (token.ok && token.data) {
      const marked = await updateAttempt(orderId, attempt.invoiceId, (a) => {
        if (a.state !== "CREATED") return false;
        a.state = "PENDING";
        return true;
      });
      return { kind: "pay", order: marked?.after ?? ready.order, attempt, auth: token.data, paymentJs: cfg.paymentJs, test: attempt.test };
    }
    log(`OAuth request failed, order ${orderId}, invoice ${attempt.invoiceId}, HTTP ${token.status}, ${token.error}`);
    await updateAttempt(orderId, attempt.invoiceId, (a) => {
      a.state = "ERROR";
      a.lastError = `OAuth request failed (HTTP ${token.status}, ${token.error})`;
      return true;
    });
    // A reused invoice may be refused by the bank: try once more with a fresh one.
    if (token.status === 0 || token.error === "credentials_missing") break;
  }
  return { kind: "unavailable", order: (await store.getOrder(orderId)) ?? order, error: "bank_unavailable" };
}

/** Orders whose payment may still change: checked every few minutes by the server timer. */
export async function reconcileOpenPayments(maxAgeHours = 72) {
  const store = await getStore();
  const since = Date.now() - maxAgeHours * 3600 * 1000;
  const orders = (await store.listOrders()).filter(
    (o) =>
      (o.payment === "halyk" || o.payment === "kaspi_online") &&
      Date.parse(o.createdAt) >= since &&
      (o.paymentStatus === "pending" || o.paymentStatus === "authorized"),
  );
  let changed = 0;
  for (const o of orders) {
    const after = await syncPayment(o.id);
    if (after && after.paymentStatus !== o.paymentStatus) changed++;
  }
  return { checked: orders.length, changed };
}
