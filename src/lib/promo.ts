import "server-only";
import { db, dbEnabled } from "@/lib/db";

/**
 * Promo codes: a percent discount on the goods, valid from one calendar day to another (Astana time).
 * Codes are case-insensitive and stored in upper case. Checked again when the order is placed,
 * so the discount can never come from the browser.
 */

export interface PromoCode {
  code: string;
  percent: number;
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD
  active: boolean;
  note: string;
  createdAt: string;
  /** Orders placed with this code, and how many of them are paid. */
  orders?: number;
  paidOrders?: number;
  revenue?: number;
}

export type PromoState = "active" | "scheduled" | "expired" | "off";

export const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;
export const normalizeCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

/** Today as YYYY-MM-DD in Astana. */
export const todayAstana = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Almaty" });

export function promoState(p: Pick<PromoCode, "active" | "startsOn" | "endsOn">, today = todayAstana()): PromoState {
  if (!p.active) return "off";
  if (today < p.startsOn) return "scheduled";
  if (today > p.endsOn) return "expired";
  return "active";
}

type Row = { code: string; percent: number; starts_on: Date | string; ends_on: Date | string; active: boolean; note: string; created_at: Date };
const day = (v: Date | string) => (typeof v === "string" ? v.slice(0, 10) : v.toLocaleDateString("sv-SE", { timeZone: "UTC" }));
const toPromo = (r: Row): PromoCode => ({
  code: r.code,
  percent: r.percent,
  startsOn: day(r.starts_on),
  endsOn: day(r.ends_on),
  active: r.active,
  note: r.note,
  createdAt: r.created_at.toISOString(),
});

export async function getPromo(code: string): Promise<PromoCode | null> {
  if (!dbEnabled()) return null;
  const [row] = await db()<Row[]>`select * from promo_codes where code = ${normalizeCode(code)}`;
  return row ? toPromo(row) : null;
}

export type PromoCheck = { ok: true; code: string; percent: number } | { ok: false; reason: "unknown" | "scheduled" | "expired" | "off" | "unavailable" };

/** Is this code usable today? */
export async function checkPromo(raw: string): Promise<PromoCheck> {
  if (!dbEnabled()) return { ok: false, reason: "unavailable" };
  const code = normalizeCode(raw);
  if (!CODE_RE.test(code)) return { ok: false, reason: "unknown" };
  const p = await getPromo(code);
  if (!p) return { ok: false, reason: "unknown" };
  const state = promoState(p);
  if (state !== "active") return { ok: false, reason: state };
  return { ok: true, code: p.code, percent: p.percent };
}

export const discountFor = (itemsTotal: number, percent: number) => Math.round((itemsTotal * percent) / 100);

export async function listPromos(): Promise<PromoCode[]> {
  if (!dbEnabled()) return [];
  const rows = await db()<(Row & { orders: number; paid: number; revenue: string | number | null })[]>`
    select p.*,
           count(o.id)::int as orders,
           count(o.id) filter (where o.data->>'paymentStatus' = 'paid' or o.status in ('paid', 'shipped', 'done'))::int as paid,
           coalesce(sum((o.data->>'subtotal')::numeric) filter (where o.data->>'paymentStatus' = 'paid' or o.status in ('paid', 'shipped', 'done')), 0) as revenue
      from promo_codes p
      left join orders o on o.data->'discount'->>'code' = p.code and o.status <> 'cancelled'
     group by p.code
     order by p.created_at desc`;
  return rows.map((r) => ({ ...toPromo(r), orders: r.orders, paidOrders: r.paid, revenue: Number(r.revenue ?? 0) }));
}

export async function savePromo(p: Omit<PromoCode, "createdAt" | "orders" | "paidOrders" | "revenue">, isNew: boolean): Promise<"exists" | "ok"> {
  if (isNew) {
    const res = await db()`
      insert into promo_codes (code, percent, starts_on, ends_on, active, note)
      values (${p.code}, ${p.percent}, ${p.startsOn}, ${p.endsOn}, ${p.active}, ${p.note})
      on conflict (code) do nothing`;
    return res.count ? "ok" : "exists";
  }
  await db()`
    update promo_codes set percent = ${p.percent}, starts_on = ${p.startsOn}, ends_on = ${p.endsOn}, active = ${p.active}, note = ${p.note}, updated_at = now()
     where code = ${p.code}`;
  return "ok";
}

export async function deletePromo(code: string) {
  await db()`delete from promo_codes where code = ${normalizeCode(code)}`;
}
