import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/admin/auth";
import { AUDIT_GROUPS, auditEmails, listAudit, type AuditAction, type AuditEntry } from "@/lib/admin/audit";
import { dbEnabled } from "@/lib/db";
import { Card, PageTitle } from "@/components/admin/ui";
import { cn } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Журнал" };

const PAGE = 100;

const TEXT: Record<AuditAction, string> = {
  login: "вошёл в админку",
  login_failed: "неудачная попытка входа",
  logout: "вышел из админки",
  password_changed: "сменил свой пароль",
  password_reset: "задал пароль по ссылке",
  staff_invited: "добавил сотрудника",
  invite_resent: "отправил приглашение повторно",
  staff_removed: "удалил сотрудника",
  product_created: "добавил товар",
  product_updated: "изменил товар",
  product_published: "показал товар на сайте",
  product_hidden: "скрыл товар в черновики",
  product_deleted: "удалил товар",
  order_status: "изменил статус заказа",
  request_status: "изменил заявку",
  blog_created: "добавил статью",
  blog_updated: "изменил статью",
  blog_deleted: "удалил статью",
};

const TONE: Partial<Record<AuditAction, string>> = {
  login_failed: "bg-rose-100 text-rose-800",
  product_deleted: "bg-rose-100 text-rose-800",
  blog_deleted: "bg-rose-100 text-rose-800",
  staff_removed: "bg-rose-100 text-rose-800",
  product_created: "bg-mint text-ink",
  blog_created: "bg-mint text-ink",
  staff_invited: "bg-mint text-ink",
};

function targetHref(e: AuditEntry): string | null {
  if (!e.target) return null;
  if (e.action.startsWith("product_") && e.action !== "product_deleted") return `/admin/products/${e.target}`;
  if (e.action === "order_status") return `/admin/orders/${e.target}`;
  if (e.action === "request_status") return "/admin/requests";
  if (e.action.startsWith("blog_") && e.action !== "blog_deleted") return `/admin/blog/${e.target}`;
  return null;
}

export default async function LogPage({ searchParams }: { searchParams: Promise<{ who?: string; group?: string; before?: string }> }) {
  await requireOwner();
  const sp = await searchParams;
  const who = sp.who || undefined;
  const group = sp.group && AUDIT_GROUPS[sp.group] ? sp.group : undefined;
  const before = Number(sp.before) || undefined;
  const [entries, people] = await Promise.all([listAudit({ email: who, group, before, limit: PAGE }), auditEmails()]);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { who, group, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/log?${s}` : "/admin/log";
  };
  const chip = (active: boolean) =>
    cn("rounded-full px-3 py-1.5 text-[13px] ring-1 transition", active ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-line hover:ring-ink");

  return (
    <>
      <PageTitle title="Журнал" subtitle="Кто и когда входил в админку и что менял. Хранится год. Видит только владелец." />
      {!dbEnabled() && (
        <Card className="mb-6">
          <p className="text-[14px] text-ink-soft">Журнал работает на боевом сервере.</p>
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <Link href={qs({ group: undefined, before: undefined })} className={chip(!group)}>
          Всё
        </Link>
        {Object.entries(AUDIT_GROUPS).map(([key, g]) => (
          <Link key={key} href={qs({ group: key, before: undefined })} className={chip(group === key)}>
            {g.label}
          </Link>
        ))}
      </div>
      {people.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href={qs({ who: undefined, before: undefined })} className={chip(!who)}>
            Все люди
          </Link>
          {people.map((p) => (
            <Link key={p} href={qs({ who: p, before: undefined })} className={chip(who === p)}>
              {p}
            </Link>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <ul className="divide-y divide-line">
          {entries.map((e) => {
            const href = targetHref(e);
            return (
              <li key={e.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
                <time className="shrink-0 text-[12px] tabular-nums text-muted sm:w-36 sm:pt-0.5">
                  {new Date(e.at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Almaty" })}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px]">
                    <span className="font-semibold">{e.email || "—"}</span>{" "}
                    <span className={cn("rounded-full px-2 py-0.5 text-[12px]", TONE[e.action] ?? "bg-sand text-ink-soft")}>{TEXT[e.action] ?? e.action}</span>{" "}
                    {e.label &&
                      (href ? (
                        <Link href={href} className="font-medium text-rose-700 hover:text-rose-900">
                          {e.action === "order_status" ? `${e.target} · ${e.label}` : e.label}
                        </Link>
                      ) : (
                        <span className="font-medium">{e.label}</span>
                      ))}
                  </p>
                  {e.details.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-0.5 text-[13px] text-ink-soft">
                      {e.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {e.ip && <span className="shrink-0 text-[11px] text-muted sm:pt-1">IP {e.ip}</span>}
              </li>
            );
          })}
          {entries.length === 0 && <li className="px-4 py-12 text-center text-[14px] text-muted">Записей пока нет</li>}
        </ul>
      </div>
      {entries.length === PAGE && (
        <div className="mt-4 flex justify-center">
          <Link href={qs({ before: String(entries[entries.length - 1].id) })} className="btn-outline">
            Показать раньше
          </Link>
        </div>
      )}
    </>
  );
}
