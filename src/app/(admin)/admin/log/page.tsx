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
const TZ = "Asia/Almaty";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Calendar day in Astana time as YYYY-MM-DD. */
const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ });
const shiftDays = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayTitle = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

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
  promo_created: "создал промокод",
  promo_updated: "изменил промокод",
  promo_deleted: "удалил промокод",
  announcement_updated: "изменил объявление над шапкой",
  home_updated: "изменил главную страницу",
  home_reset: "вернул блок главной как было",
};

const TONE: Partial<Record<AuditAction, string>> = {
  login_failed: "bg-rose-100 text-rose-800",
  product_deleted: "bg-rose-100 text-rose-800",
  blog_deleted: "bg-rose-100 text-rose-800",
  staff_removed: "bg-rose-100 text-rose-800",
  product_created: "bg-mint text-ink",
  blog_created: "bg-mint text-ink",
  staff_invited: "bg-mint text-ink",
  promo_created: "bg-mint text-ink",
  promo_deleted: "bg-rose-100 text-rose-800",
};

function targetHref(e: AuditEntry): string | null {
  if (!e.target) return null;
  if (e.action.startsWith("product_") && e.action !== "product_deleted") return `/admin/products/${e.target}`;
  if (e.action === "order_status") return `/admin/orders/${e.target}`;
  if (e.action === "request_status") return "/admin/requests";
  if (e.action.startsWith("blog_") && e.action !== "blog_deleted") return `/admin/blog/${e.target}`;
  if (e.action === "promo_created" || e.action === "promo_updated") return "/admin/promos";
  if (e.action === "announcement_updated") return "/admin/announcement";
  if (e.action === "home_updated" || e.action === "home_reset") return `/admin/home#${e.target}`;
  return null;
}

export default async function LogPage({ searchParams }: { searchParams: Promise<{ who?: string; group?: string; before?: string; from?: string; to?: string }> }) {
  await requireOwner();
  const sp = await searchParams;
  const who = sp.who || undefined;
  const group = sp.group && AUDIT_GROUPS[sp.group] ? sp.group : undefined;
  const before = Number(sp.before) || undefined;
  let from = sp.from && DATE_RE.test(sp.from) ? sp.from : undefined;
  let to = sp.to && DATE_RE.test(sp.to) ? sp.to : undefined;
  if (from && to && from > to) [from, to] = [to, from];
  const [entries, people] = await Promise.all([listAudit({ email: who, group, before, from, to, limit: PAGE }), auditEmails()]);
  const today = dayKey(new Date());
  const yesterday = shiftDays(today, -1);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { who, group, from, to, ...patch };
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

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4">
        <form action="/admin/log" className="flex flex-wrap items-end gap-3">
          {who && <input type="hidden" name="who" value={who} />}
          {group && <input type="hidden" name="group" value={group} />}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">С даты</span>
            <input type="date" name="from" defaultValue={from} max={today} className="input py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">По дату</span>
            <input type="date" name="to" defaultValue={to} max={today} className="input py-2" />
          </label>
          <button type="submit" className="btn-primary px-5 py-2.5">
            Показать
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Link href={qs({ from: today, to: today, before: undefined })} className={chip(from === today && to === today)}>
            Сегодня
          </Link>
          <Link href={qs({ from: yesterday, to: yesterday, before: undefined })} className={chip(from === yesterday && to === yesterday)}>
            Вчера
          </Link>
          <Link href={qs({ from: shiftDays(today, -6), to: today, before: undefined })} className={chip(from === shiftDays(today, -6) && to === today)}>
            7 дней
          </Link>
          {(from || to) && (
            <Link href={qs({ from: undefined, to: undefined, before: undefined })} className={chip(false)}>
              За всё время
            </Link>
          )}
        </div>
      </div>
      {(from || to) && (
        <p className="mb-3 text-[13px] text-ink-soft">
          Период: {from ? dayTitle(from) : "с начала"} — {to ? dayTitle(to) : "сегодня"}
        </p>
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
          {entries.map((e, i) => {
            const href = targetHref(e);
            const day = dayKey(new Date(e.at));
            const newDay = i === 0 || dayKey(new Date(entries[i - 1].at)) !== day;
            return (
              <li key={e.id} className="flex flex-col">
                {newDay && <p className="bg-sand px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-soft">{dayTitle(day)}</p>}
                <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
                <time className="shrink-0 text-[12px] tabular-nums text-muted sm:w-14 sm:pt-0.5">
                  {new Date(e.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}
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
                </div>
              </li>
            );
          })}
          {entries.length === 0 && <li className="px-4 py-12 text-center text-[14px] text-muted">{from || to ? "За этот период записей нет" : "Записей пока нет"}</li>}
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
