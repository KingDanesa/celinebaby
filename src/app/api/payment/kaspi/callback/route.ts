import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { INVOICE_RE } from "@/lib/payment/halyk";
import { kaspiVerifyNotification } from "@/lib/payment/kaspi";
import { checkCallbackSignature, reconcileKaspi } from "@/lib/payment/kaspi-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kaspi payment notifications. The URL carries our invoice id and a per-payment signature;
 * the notification itself is only a hint: the state is re-read from Kaspi before the order changes.
 */
async function handle(req: Request) {
  const url = new URL(req.url);
  const invoice = url.searchParams.get("inv") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  if (!INVOICE_RE.test(invoice)) return NextResponse.json({ ok: false, error: "invalid_invoice" }, { status: 400 });

  const order = await (await getStore()).getOrderByInvoice(invoice);
  const attempt = order?.payments?.find((p) => p.invoiceId === invoice && p.provider === "kaspi");
  if (!order || !attempt) return NextResponse.json({ ok: false, error: "invoice_not_found" }, { status: 404 });
  if (!checkCallbackSignature(attempt, sig)) return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 403 });

  const raw = req.method === "POST" ? await req.text().catch(() => "") : "";
  if (!(await kaspiVerifyNotification(raw, req.headers))) return NextResponse.json({ ok: false, error: "invalid_notification" }, { status: 403 });

  const ok = await reconcileKaspi(order.id, invoice);
  return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
}

export const POST = handle;
export const GET = handle;
