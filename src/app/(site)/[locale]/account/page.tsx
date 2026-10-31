import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { pageContext } from "@/lib/page";
import { getCurrentUser } from "@/lib/auth/server";
import { logoutAction } from "@/lib/auth/actions";
import { getStore } from "@/lib/store";
import { PasswordForm, ProfileForm } from "@/components/account/AuthForms";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.account.title };
}

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ reset?: string }> }) {
  const { locale, t, href } = await pageContext(params);
  const { reset } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(href("/account/login"));
  const store = await getStore();
  const orders = await store.listOrdersForUser(user.id, user.email);

  return (
    <div className="container-x pt-6 sm:pt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">{t.account.title}</p>
          <h1 className="text-[30px] font-semibold sm:text-[40px]">
            {t.account.hello}, {user.name.split(" ")[0] || user.email}
          </h1>
        </div>
        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn-outline h-10 px-4 text-[11px]">
            <LogOut className="h-4 w-4" /> {t.account.logout}
          </button>
        </form>
      </div>
      {reset && <p className="mt-4 rounded-xl bg-mint px-4 py-2 text-[13px]">{t.account.resetDone}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <h2 className="mb-4 text-[20px] font-semibold">{t.account.orders}</h2>
          {orders.length === 0 ? (
            <div className="rounded-2xl bg-pink-soft px-6 py-10 text-center text-[14px] text-muted">
              {t.account.noOrders}
              <div className="mt-4">
                <Link href={href("/catalog")} className="btn-primary">
                  {t.cart.goCatalog}
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={href(`/account/orders/${o.id}`)} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-pink-soft/60">
                    <div>
                      <p className="text-[15px] font-semibold">{o.id}</p>
                      <p className="text-[12px] text-muted">
                        {new Date(o.createdAt).toLocaleDateString(locale === "kk" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric" })} · {o.items.reduce((s, i) => s + i.qty, 0)} {t.cart.items}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-semibold tabular-nums">{formatPrice(o.subtotal)}</p>
                      <p className="text-[12px] text-rose-700">{t.account.statuses[o.status] ?? o.status}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="flex flex-col gap-6 lg:col-span-5">
          <section className="rounded-2xl border border-line bg-white p-6">
            <h2 className="mb-4 text-[18px] font-semibold">{t.account.profile}</h2>
            <p className="mb-4 text-[13px] text-muted">{user.email}</p>
            <ProfileForm user={user} />
          </section>
          <section className="rounded-2xl border border-line bg-white p-6">
            <h2 className="mb-4 text-[18px] font-semibold">{t.account.changePassword}</h2>
            <PasswordForm />
          </section>
        </aside>
      </div>
    </div>
  );
}
