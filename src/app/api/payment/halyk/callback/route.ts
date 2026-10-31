import { NextResponse } from "next/server";
import { getStore, type Order } from "@/lib/store";
import { checkStatus, isFailedStatus, isPaidStatus } from "@/lib/payment/halyk";
import { sendPaidEmails } from "@/lib/email";

export const runtime = "nodejs";

/**
 * postLink / failurePostLink from Halyk ePay. The bank's payload is only a hint:
 * the real state is read back from the status API before the order is updated.
 */
export async function POST(req: Request) {
  let payload: Record<string, unknown> = {};
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    try {
      const form = await req.formData();
      payload = Object.fromEntries(form.entries());
    } catch {}
  }
  const invoiceId = String(payload.invoiceId ?? payload.invoiceID ?? payload.invoice_id ?? "");
  if (!invoiceId) return NextResponse.json({ ok: false, error: "no invoiceId" }, { status: 400 });

  const store = await getStore();
  const order = await store.getOrderByInvoice(invoiceId);
  if (!order) return NextResponse.json({ ok: false, error: "unknown invoice" }, { status: 404 });
  if (order.paymentStatus === "paid") return NextResponse.json({ ok: true });

  const res = await checkStatus(invoiceId);
  if (!res.ok || !res.transaction) return NextResponse.json({ ok: false, error: "status check failed" }, { status: 502 });
  const tx = res.transaction;
  if (Math.round(Number(tx.amount)) !== Math.round(order.subtotal)) {
    console.error("[halyk] amount mismatch", tx.amount, order.subtotal, order.id);
    return NextResponse.json({ ok: false, error: "amount mismatch" }, { status: 409 });
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (isPaidStatus(tx.statusName)) {
    const paid: Order = { ...order, paymentStatus: "paid", status: order.status === "new" ? "paid" : order.status, paidAt: new Date().toISOString(), paymentRef: tx.id };
    await store.saveOrder(paid);
    sendPaidEmails(paid, site).catch((e) => console.error("[email]", e));
  } else if (isFailedStatus(tx.statusName)) {
    await store.saveOrder({ ...order, paymentStatus: "failed", paymentRef: tx.id });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
