import Link from "next/link";
import { cn } from "@/lib/format";

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white", className)}>
      {title && <h2 className="border-b border-line px-5 py-3.5 text-[13px] font-semibold uppercase tracking-wider text-muted">{title}</h2>}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <div className="rounded-2xl border border-line bg-white p-5 transition hover:border-rose-300">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tabular-nums">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const statusMap: Record<string, { label: string; cls: string }> = {
  new: { label: "Новый", cls: "bg-rose-100 text-rose-800" },
  paid: { label: "Оплачен", cls: "bg-emerald-100 text-emerald-800" },
  shipped: { label: "Отправлен", cls: "bg-sky-100 text-sky-800" },
  done: { label: "Выполнен", cls: "bg-stone text-ink-soft" },
  cancelled: { label: "Отменён", cls: "bg-stone text-muted" },
  active: { label: "На сайте", cls: "bg-emerald-100 text-emerald-800" },
  draft: { label: "Черновик", cls: "bg-stone text-muted" },
};

export function Badge({ status }: { status: string }) {
  const s = statusMap[status] ?? { label: status, cls: "bg-stone text-ink-soft" };
  return <span className={cn("inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold", s.cls)}>{s.label}</span>;
}

export const ORDER_STATUSES = ["new", "paid", "shipped", "done", "cancelled"] as const;
export const orderStatusLabel = (s: string) => statusMap[s]?.label ?? s;
