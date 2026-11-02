import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { reconcileOpenPayments } from "@/lib/payment/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by the server timer every few minutes (deploy/celinebaby-reconcile.timer):
 * re-checks unfinished payments in case the bank's callback was lost.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("x-cron-secret") ?? "";
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  const res = await reconcileOpenPayments();
  return NextResponse.json({ ok: true, ...res });
}
