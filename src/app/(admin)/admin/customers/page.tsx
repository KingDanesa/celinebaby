import { requireAdmin } from "@/lib/admin/auth";
import { authClient, authEnabled, toSiteUser } from "@/lib/auth/server";
import { getStore } from "@/lib/store";
import { PageTitle } from "@/components/admin/ui";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  await requireAdmin();
  if (!authEnabled()) {
    return (
      <>
        <PageTitle title="Покупатели" />
        <p className="text-[14px] text-muted">Личные кабинеты работают только с Supabase. Задайте SUPABASE_URL и ключ.</p>
      </>
    );
  }
  const [{ data }, store] = await Promise.all([authClient().auth.admin.listUsers({ page: 1, perPage: 500 }), getStore()]);
  const orders = await store.listOrders();
  const users = (data?.users ?? []).map(toSiteUser).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const stats = new Map<string, { count: number; sum: number }>();
  for (const o of orders) {
    const key = o.userId ?? o.customer.email?.toLowerCase();
    if (!key) continue;
    const s = stats.get(key) ?? { count: 0, sum: 0 };
    s.count++;
    s.sum += o.subtotal;
    stats.set(key, s);
  }
  return (
    <>
      <PageTitle title="Покупатели" subtitle={`${users.length} аккаунтов`} />
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-[14px]">
          <thead className="bg-sand text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Имя</th>
              <th className="px-4 py-3">Контакты</th>
              <th className="hidden px-4 py-3 md:table-cell">Город</th>
              <th className="hidden px-4 py-3 sm:table-cell">Регистрация</th>
              <th className="px-4 py-3 text-right">Заказы</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => {
              const s = stats.get(u.id) ?? stats.get(u.email.toLowerCase());
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.name || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {u.email}
                    <br />
                    <span className="text-[12px] text-muted">{u.phone}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft md:table-cell">{u.city || "—"}</td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("ru-RU") : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{s ? `${s.count} · ${formatPrice(s.sum)}` : "—"}</td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  Пока никто не зарегистрировался
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
