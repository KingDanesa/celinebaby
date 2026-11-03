import "server-only";
import { db, dbEnabled } from "@/lib/db";
import { clientIp } from "@/lib/rate-limit";
import type { AdminUser } from "./users";

/**
 * Admin activity log: who signed in and what they changed (products, orders, requests, blog, access).
 * Written by every admin action; read on /admin/log by the owner. A failed write never breaks the action.
 */

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "password_changed"
  | "password_reset"
  | "staff_invited"
  | "invite_resent"
  | "staff_removed"
  | "product_created"
  | "product_updated"
  | "product_published"
  | "product_hidden"
  | "product_deleted"
  | "order_status"
  | "request_status"
  | "blog_created"
  | "blog_updated"
  | "blog_deleted"
  | "promo_created"
  | "promo_updated"
  | "promo_deleted"
  | "announcement_updated";

export const AUDIT_GROUPS: Record<string, { label: string; actions: AuditAction[] }> = {
  access: { label: "Входы и доступ", actions: ["login", "login_failed", "logout", "password_changed", "password_reset", "staff_invited", "invite_resent", "staff_removed"] },
  products: { label: "Товары", actions: ["product_created", "product_updated", "product_published", "product_hidden", "product_deleted"] },
  orders: { label: "Заказы", actions: ["order_status"] },
  requests: { label: "Заявки", actions: ["request_status"] },
  blog: { label: "Блог", actions: ["blog_created", "blog_updated", "blog_deleted"] },
  promos: { label: "Промокоды", actions: ["promo_created", "promo_updated", "promo_deleted"] },
  site: { label: "Объявление", actions: ["announcement_updated"] },
};

export interface AuditEntry {
  id: number;
  at: string;
  adminId: string | null;
  email: string;
  action: AuditAction;
  target: string | null;
  label: string | null;
  details: string[];
  ip: string | null;
}

interface AuditInput {
  admin?: Pick<AdminUser, "id" | "email"> | null;
  /** For actions without a signed-in admin (failed login, reset link). */
  email?: string;
  /** What was touched: product id, order id, request id, blog slug, staff e-mail. */
  target?: string | number;
  /** Human name of the target, e.g. the product name. */
  label?: string;
  /** Short human-readable lines: "Цена: 12 900 → 13 900". */
  details?: string[];
}

let lastCleanup = 0;

export async function audit(action: AuditAction, input: AuditInput = {}): Promise<void> {
  if (!dbEnabled()) return;
  try {
    const adminId = input.admin && input.admin.id !== "shared" ? input.admin.id : null;
    const email = (input.admin?.email || input.email || "").slice(0, 120);
    const details = (input.details ?? []).map((d) => d.slice(0, 300)).slice(0, 40);
    const ip = await clientIp().catch(() => null);
    await db()`
      insert into admin_audit (admin_id, email, action, target, label, details, ip)
      values (${adminId}, ${email}, ${action}, ${input.target === undefined ? null : String(input.target).slice(0, 200)},
              ${input.label ? input.label.slice(0, 200) : null}, ${db().json(details as never)}, ${ip})`;
    // Keep one year of history.
    if (Date.now() - lastCleanup > 24 * 3600 * 1000) {
      lastCleanup = Date.now();
      await db()`delete from admin_audit where at < now() - interval '365 days'`;
    }
  } catch (e) {
    console.error("[audit] write failed", e);
  }
}

type Row = { id: string | number; at: Date; admin_id: string | null; email: string; action: AuditAction; target: string | null; label: string | null; details: string[]; ip: string | null };

/** Dates are calendar days in Astana time, "YYYY-MM-DD"; both ends included. */
export async function listAudit(opts: { email?: string; group?: string; before?: number; limit?: number; from?: string; to?: string }): Promise<AuditEntry[]> {
  if (!dbEnabled()) return [];
  const actions = opts.group && AUDIT_GROUPS[opts.group] ? AUDIT_GROUPS[opts.group].actions : null;
  const limit = Math.min(opts.limit ?? 100, 500);
  const rows = await db()<Row[]>`
    select * from admin_audit
     where (${opts.email ?? null}::text is null or email = ${opts.email ?? null})
       and (${actions === null} or action = any(${actions ?? []}))
       and (${opts.before ?? null}::bigint is null or id < ${opts.before ?? null})
       and (${opts.from ?? null}::date is null or at >= (${opts.from ?? null}::date)::timestamp at time zone 'Asia/Almaty')
       and (${opts.to ?? null}::date is null or at < ((${opts.to ?? null}::date) + 1)::timestamp at time zone 'Asia/Almaty')
     order by at desc, id desc
     limit ${limit}`;
  return rows.map((r) => ({
    id: Number(r.id),
    at: r.at.toISOString(),
    adminId: r.admin_id,
    email: r.email,
    action: r.action,
    target: r.target,
    label: r.label,
    details: Array.isArray(r.details) ? r.details : [],
    ip: r.ip,
  }));
}

export async function auditEmails(): Promise<string[]> {
  if (!dbEnabled()) return [];
  const rows = await db()`select distinct email from admin_audit where email <> '' order by email`;
  return rows.map((r) => r.email as string);
}

/** "Цена: 12900 → 13900" lines for the fields that changed. */
export function diffLines(before: Record<string, unknown> | undefined, after: Record<string, unknown>, fields: [key: string, label: string, fmt?: (v: unknown) => string][]): string[] {
  if (!before) return [];
  const show = (v: unknown, fmt?: (v: unknown) => string) => {
    if (fmt) return fmt(v);
    if (v === null || v === undefined || v === "") return "—";
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
    if (typeof v === "boolean") return v ? "да" : "нет";
    return String(v);
  };
  const out: string[] = [];
  for (const [key, label, fmt] of fields) {
    const a = JSON.stringify(before[key] ?? null);
    const b = JSON.stringify(after[key] ?? null);
    if (a !== b) out.push(`${label}: ${show(before[key], fmt)} → ${show(after[key], fmt)}`);
  }
  return out;
}
