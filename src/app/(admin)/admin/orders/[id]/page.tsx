import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { getStore } from "@/lib/store";
import { Badge, Card, PageTitle } from "@/components/admin/ui";
import { formatPrice, imageUrl } from "@/lib/format";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import ru from "@/i18n/ru";

const paymentStatusLabel: Record<string, string> = {
  unpaid: "не оплачен",
  pending: "ждём банк",
  authorized: "деньги заблокированы, списываем",
  paid: "оплачен",
  failed: "оплата не прошла",
  refunded: "деньги возвращены",
};
const stateLabel: Record<string, string> = {
  CREATED: "создан",
  PENDING: "открыта форма банка",
  NEW: "в процессе",
  FINGERPRINT: "в процессе",
  VERIFIED: "в процессе",
  AUTH: "заблокировано",
  CAPTURING: "списываем",
  CHARGE: "списано",
  FAILED: "ошибка",
  REJECT: "отклонено",
  "3D": "не прошёл 3-D Secure",
  CANCEL: "отменён",
  CANCEL_OLD: "отменён",
  REFUND: "возврат",
  ERROR: "ошибка связи с банком",
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const store = await getStore();
  const order = await store.getOrder(id);
  if (!order) notFound();
  const delivery = ru.checkout.deliveryMethods.find((m) => m.id === order.delivery)?.title ?? order.delivery;
  const payment = ru.checkout.paymentMethods.find((m) => m.id === order.payment)?.title ?? order.payment;

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Все заказы
      </Link>
      <PageTitle title={`Заказ ${order.id}`} subtitle={new Date(order.createdAt).toLocaleString("ru-RU")} action={<Badge status={order.status} />} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card title="Товары">
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.key} className="flex items-center gap-4 py-3">
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                    <Image src={imageUrl(i.image)} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/ru/product/${i.slug}`} target="_blank" className="line-clamp-1 text-[14px] hover:text-rose-700">
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
              <span>Итого</span>
              <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
            </div>
          </Card>
          {!!order.payments?.length && (
            <Card title="Онлайн-оплата">
              <ul className="divide-y divide-line text-[13px]">
                {[...order.payments].reverse().map((p) => (
                  <li key={p.invoiceId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="tabular-nums text-ink-soft">
                      {p.provider === "kaspi" ? "Kaspi" : "Halyk"} · счёт {p.invoiceId}
                      {p.test ? " · тест" : ""}
                      {p.cardMask ? ` · карта ${p.cardMask}` : ""}
                    </span>
                    <span>
                      {stateLabel[p.state] ?? p.state}
                      <span className="ml-2 text-muted">{new Date(p.updatedAt).toLocaleString("ru-RU")}</span>
                    </span>
                    {p.lastError && <span className="w-full text-[12px] text-rose-700">{p.lastError}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="Покупатель">
            <dl className="grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
              <Row k="Имя" v={order.customer.name} />
              <Row k="Телефон" v={<a href={`tel:${order.customer.phone}`} className="hover:text-rose-700">{order.customer.phone}</a>} />
              <Row k="E-mail" v={order.customer.email ?? "—"} />
              <Row k="Город" v={order.customer.city} />
              <Row k="Адрес" v={order.customer.address ?? "—"} />
              <Row k="Комментарий" v={order.customer.comment ?? "—"} />
              <Row k="Доставка" v={delivery} />
              <Row k="Оплата" v={`${payment} · ${paymentStatusLabel[order.paymentStatus ?? "unpaid"]}`} />
              {order.paymentRef && <Row k={order.payment === "kaspi_online" ? "Платёж Kaspi" : "Транзакция Halyk"} v={order.paymentRef} />}
              {order.paidAt && <Row k="Оплачен" v={new Date(order.paidAt).toLocaleString("ru-RU")} />}
              <Row k="Аккаунт" v={order.userId ? "Зарегистрированный покупатель" : "Гость"} />
            </dl>
          </Card>
        </div>
        <aside className="lg:col-span-4">
          <Card title="Статус">
            <OrderStatusForm id={order.id} status={order.status} />
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{k}</dt>
      <dd className="mt-0.5">{v}</dd>
    </div>
  );
}
