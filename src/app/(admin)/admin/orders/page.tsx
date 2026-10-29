import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getStore } from "@/lib/store";
import { Badge, PageTitle } from "@/components/admin/ui";
import { formatPrice } from "@/lib/format";

export default async function OrdersPage() {
  await requireAdmin();
  const store = await getStore();
  const orders = await store.listOrders();
  return (
    <>
      <PageTitle title="Заказы" subtitle={`${orders.length} шт.`} />
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-[14px]">
          <thead className="bg-sand text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Номер</th>
              <th className="px-4 py-3">Покупатель</th>
              <th className="hidden px-4 py-3 md:table-cell">Дата</th>
              <th className="hidden px-4 py-3 sm:table-cell">Товаров</th>
              <th className="px-4 py-3 text-right">Сумма</th>
              <th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-rose-50/40">
                <td className="whitespace-nowrap px-4 py-3 font-semibold">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-rose-700">
                    {o.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p>{o.customer.name}</p>
                  <p className="text-[12px] text-muted">
                    {o.customer.phone} · {o.customer.city}
                  </p>
                </td>
                <td className="hidden px-4 py-3 text-ink-soft md:table-cell">{new Date(o.createdAt).toLocaleString("ru-RU")}</td>
                <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatPrice(o.subtotal)}</td>
                <td className="px-4 py-3">
                  <Badge status={o.status} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  Заказов пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
