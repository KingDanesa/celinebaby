"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, KeyRound, LayoutDashboard, LogOut, Menu, Package, ShoppingBag, Tags, Users, X } from "lucide-react";
import { cn } from "@/lib/format";
import { logoutAction } from "@/lib/admin/access-actions";
import { Wordmark } from "@/components/ui/Logo";

const nav = [
  { href: "/admin", label: "Обзор", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Товары", icon: Package },
  { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
  { href: "/admin/customers", label: "Покупатели", icon: Users },
  { href: "/admin/categories", label: "Категории", icon: Tags },
  { href: "/admin/access", label: "Доступ", icon: KeyRound },
];

export function AdminSidebar({ who }: { who: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="flex flex-col gap-1">
      {nav.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition",
              active ? "bg-rose-600 text-white" : "text-ink-soft hover:bg-rose-50 hover:text-rose-800",
            )}
          >
            <n.icon className="h-[18px] w-[18px]" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
      {who && <p className="truncate px-3 pb-1 text-[12px] text-muted">{who}</p>}
      <a href="/ru" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-ink-soft hover:bg-rose-50">
        <ExternalLink className="h-[18px] w-[18px]" /> Открыть сайт
      </a>
      <form action={logoutAction}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-ink-soft hover:bg-rose-50">
          <LogOut className="h-[18px] w-[18px]" /> Выйти
        </button>
      </form>
    </div>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 lg:flex">
        <Link href="/admin" className="mb-8 px-3">
          <Wordmark width={130} />
          <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Админка</span>
        </Link>
        {links}
        {footer}
      </aside>

      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <Wordmark width={110} />
        <button type="button" aria-label="Меню" onClick={() => setOpen(true)} className="p-2">
          <Menu className="h-6 w-6" />
        </button>
      </div>
      <div className="h-14 lg:hidden" />
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white px-4 py-6 animate-slide-in-left">
            <div className="mb-6 flex items-center justify-between px-3">
              <Wordmark width={120} />
              <button type="button" aria-label="Закрыть" onClick={() => setOpen(false)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            {links}
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
