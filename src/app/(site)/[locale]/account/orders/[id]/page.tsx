import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { pageContext } from "@/lib/page";
import { getCurrentUser } from "@/lib/auth/server";
import { getStore } from "@/lib/store";
import { syncPaymentStatus } from "@/lib/actions/orders";
import { formatPrice, imageUrl } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AccountOrderPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const { locale, t, href } = await pageContext(params);
  const user = await getCurrentUser();
  if (!user) redirect(href("/account/login"));
  const store = await getStore();
  let order = await store.getOrder(id);
  if (!order) notFound();
  const mine = order.userId === user.id || (order.customer.email ?? "").toLowerCase() === user.email.toLowerCase();
  if (!mine) notFound();
  if (order.payment === "halyk" && order.paymentStatus !== "paid") order = (await syncPaymentStatus(id)) ?? order;

  const delivery = t.checkout.deliveryMethods.find((m) => m.id === order.delivery)?.title ?? order.delivery;
  const payment = t.checkout.paymentMethods.find((m) => m.id === order.payment)?.title ?? order.payment;

  return (
    <div className="container-x pt-6 sm:pt-10">
      <Link href={href("/account")} className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {t.account.orders}
      </Link>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-[28px] font-semibold sm:text-[36px]">
          {t.account.order} {order.id}
        </h1>
        <p className="text-[13px] text-muted">{new Date(order.createdAt).toLocaleString(locale === "kk" ? "kk-KZ" : "ru-RU")}</p>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-line bg-white p-5 lg:col-span-8">
          <ul className="divide-y divide-line">
            {order.items.map((i) => (
              <li key={i.key} className="flex items-center gap-4 py-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-pink-soft">
                  <Image src={imageUrl(i.image)} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={href(`/product/${i.slug}`)} className="line-clamp-1 text-[14px] hover:text-rose-700">
                    {i.name}
                  </Link>
                  <p className="text-[12px] text-muted">
                    {[i.color, i.size].filter(Boolean).join(" · ")} × {i.qty}
                  </p>
                </div>
                <span className="text-[14px] font-medium tabular-nums">{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-line pt-3 text-[15px] font-semibold">
            <span>{t.cart.total}</span>
            <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
          </div>
        </section>
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-2xl bg-pink-soft p-5 text-[14px]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t.account.orderStatus}</p>
            <p className="mt-1 font-semibold">{t.account.statuses[order.status] ?? order.status}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{t.checkout.paymentTitle}</p>
            <p className="mt-1">
              {payment} · {t.account.paymentStatuses[order.paymentStatus] ?? order.paymentStatus}
            </p>
            {order.payment === "halyk" && order.paymentStatus !== "paid" && (
              <Link href={href(`/pay/${order.id}`)} className="btn-primary mt-4 w-full">
                {t.checkout.payAgain}
              </Link>
            )}
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{t.checkout.deliveryTitle}</p>
            <p className="mt-1">
              {delivery}
              <br />
              {order.customer.city}
              {order.customer.address ? `, ${order.customer.address}` : ""}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
