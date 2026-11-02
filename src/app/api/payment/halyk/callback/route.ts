import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { amountToMinor, INVOICE_RE, secureEquals } from "@/lib/payment/halyk";
import { reconcile } from "@/lib/payment/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * postLink / failurePostLink of Halyk ePay — same checks as the old module's handleCallback():
 * invoice format → known attempt → secret_hash → amount, currency, terminal → status API → charge.
 */
export async function POST(req: Request) {
  const payload = await readPayload(req);
  const invoiceId = pick(payload, ["invoiceId", "invoiceID", "invoice_id"]);
  if (typeof invoiceId !== "string" && typeof invoiceId !== "number") return reply(400, { ok: false, error: "invalid_invoice" });
  const invoice = String(invoiceId);
  if (!INVOICE_RE.test(invoice)) return reply(400, { ok: false, error: "invalid_invoice" });

  const order = await (await getStore()).getOrderByInvoice(invoice);
  const attempt = order?.payments?.find((p) => p.invoiceId === invoice);
  if (!order || !attempt) return reply(404, { ok: false, error: "invoice_not_found" });

  if (!secureEquals(attempt.secretHash, pick(payload, ["secret_hash", "secretHash"]))) {
    console.warn(`[halyk] callback rejected: secret_hash mismatch, invoice ${invoice}`);
    return reply(403, { ok: false, error: "invalid_signature" });
  }

  const amount = amountToMinor(pick(payload, ["amount"]));
  const currency = String(pick(payload, ["currency"]) ?? "").toUpperCase();
  const terminal = String(pick(payload, ["terminal", "terminalID", "terminalId"]) ?? "");
  if (amount !== attempt.amountMinor || currency !== attempt.currency || terminal !== attempt.terminal) {
    console.warn(`[halyk] callback rejected: payment fields mismatch, invoice ${invoice}`);
    return reply(400, { ok: false, error: "payment_mismatch" });
  }

  const result = await reconcile(order.id, invoice, true);
  if (!result.ok) return reply(503, { ok: false, error: "status_unavailable" });
  return reply(200, { ok: true, status: result.status });
}

export async function GET() {
  return reply(200, { ok: true });
}

async function readPayload(req: Request): Promise<Record<string, unknown>> {
  const raw = await req.text().catch(() => "");
  let out: Record<string, unknown> = {};
  if (!raw.trim()) return out;
  try {
    const json = JSON.parse(raw);
    if (json && typeof json === "object") out = json as Record<string, unknown>;
  } catch {
    out = Object.fromEntries(new URLSearchParams(raw).entries());
  }
  return out;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (k in obj) return obj[k];
  return undefined;
}

function reply(status: number, data: unknown) {
  return NextResponse.json(data, { status });
}
