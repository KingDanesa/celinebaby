import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { loadAllProducts } from "@/lib/products";
import { getStore } from "@/lib/store";
import { Badge, Card, PageTitle, Stat } from "@/components/admin/ui";
import { formatPrice, imageUrl } from "@/lib/format";
import ru from "@/i18n/ru";
import { halykConfig, halykEnabled } from "@/lib/payment/halyk";
import { emailMode } from "@/lib/email";

export default async function AdminHome() {
  await requireAdmin();
  const [products, store] = await Promise.all([loadAllProducts(), getStore()]);
  const orders = await store.listOrders();
  const active = products.filter((p) => p.status !== "draft");
  const drafts = products.length - active.length;
  const noPhoto = products.filter((p) => p.images.length === 0).length;
  const recent = [...products].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, 6);

  return (
    <>
      <PageTitle
        title="Обзор"
        subtitle={systemLine(store.name)}
        action={
          <Link href="/admin/products/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Добавить товар
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Товаров на сайте" value={active.length} href="/admin/products" />
        <Stat label="Черновиков" value={drafts} href="/admin/products?status=draft" />
        <Stat label="Без фото" value={noPhoto} href="/admin/products?photo=none" />
        <Stat label="Новых заказов" value={orders.filter((o) => o.status === "new").length} href="/admin/orders" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Последние заказы">
          {orders.length === 0 ? (
            <p className="text-[14px] text-muted">Заказов пока нет. Оформите тестовый заказ на сайте, и он появится здесь.</p>
          ) : (
            <ul className="divide-y divide-line">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-4 py-3 hover:text-rose-700">
                    <div>
                      <p className="text-[14px] font-semibold">{o.id}</p>
                      <p className="text-[12px] text-muted">
                        {o.customer.name} · {new Date(o.createdAt).toLocaleString("ru-RU")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[14px] font-medium tabular-nums">{formatPrice(o.subtotal)}</span>
                      <Badge status={o.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Недавно изменённые товары">
          <ul className="divide-y divide-line">
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 py-2.5 hover:text-rose-700">
                  <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-sand">
                    {p.images[0] && <Image src={imageUrl(p.images[0])} alt="" fill sizes="40px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[14px]">{p.name}</p>
                    <p className="text-[12px] text-muted">{ru.categories[p.category]}</p>
                  </div>
                  <Badge status={p.status ?? "active"} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function systemLine(storeName: string): string {
  const db = storeName === "pg" ? "своя база" : storeName === "supabase" ? "Supabase (демо)" : "локальные файлы";
  const pay = !halykEnabled() ? "онлайн-оплата выключена" : halykConfig().test ? "оплата: ТЕСТОВЫЙ режим" : "оплата: боевой режим";
  const mail = { smtp: "письма: почта (SMTP)", resend: "письма: Resend", log: "письма НЕ отправляются" }[emailMode()];
  return `${db} · ${pay} · ${mail}`;
}
