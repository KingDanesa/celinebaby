import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pageContext } from "@/lib/page";
import { callbackUrl, preparePayment, siteUrl } from "@/lib/payment/service";
import { HalykWidget } from "@/components/cart/HalykWidget";
import { formatPrice } from "@/lib/format";
import { Monogram } from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const { locale, t, href } = await pageContext(params);
  const store = await (await import("@/lib/store")).getStore();
  if ((await store.getOrder(id))?.payment === "kaspi_online") {
    const { prepareKaspiPayment } = await import("@/lib/payment/kaspi-service");
    const k = await prepareKaspiPayment(id, locale);
    if (k.kind === "notfound") notFound();
    if (k.kind === "paid") redirect(href(`/checkout/success?order=${id}`));
    if (k.kind === "redirect") redirect(k.url);
  }
  const prepared = await preparePayment(id);
  if (prepared.kind === "notfound") notFound();
  if (prepared.kind === "paid" || prepared.kind === "processing") redirect(href(`/checkout/success?order=${id}`));
  const { order } = prepared;
  const site = siteUrl();

  return (
    <div className="container-x flex flex-col items-center py-16 text-center sm:py-24">
      <Monogram size={72} className="opacity-40" />
      <h1 className="mt-5 text-[28px] font-semibold sm:text-[36px]">{t.pay.title}</h1>
      <p className="mt-2 text-[14px] text-muted">
        {t.checkout.orderNumber}: <span className="font-semibold text-ink">{order.id}</span>
      </p>
      <p className="mt-5 text-[13px] uppercase tracking-[0.14em] text-muted">{t.pay.amount}</p>
      <p className="mt-1 text-[32px] font-semibold tabular-nums">{formatPrice(order.subtotal)}</p>

      {prepared.kind === "pay" ? (
        <>
          <p className="mt-6 max-w-md text-[14px] text-ink-soft">{t.pay.text}</p>
          <HalykWidget
            scriptUrl={prepared.paymentJs}
            payment={{
              invoiceId: prepared.attempt.invoiceId,
              backLink: `${site}${href(`/checkout/success?order=${order.id}`)}`,
              failureBackLink: `${site}${href(`/checkout/success?order=${order.id}&failed=1`)}`,
              autoBackLink: true,
              postLink: callbackUrl(),
              failurePostLink: callbackUrl(),
              language: locale === "kk" ? "kaz" : "rus",
              description: `Celine Baby, заказ ${order.id}`,
              accountId: order.userId ? String(order.userId) : `guest-${order.id}`,
              terminal: prepared.attempt.terminal,
              amount: prepared.attempt.amountMinor / 100,
              currency: "KZT",
              auth: prepared.auth,
              email: order.customer.email,
              phone: order.customer.phone.replace(/[^0-9+]/g, ""),
            }}
            labels={{ open: t.pay.open, opening: t.pay.opening }}
          />
          {prepared.test && <p className="mt-4 rounded-xl bg-cream px-4 py-2 text-[12px] text-ink-soft">{t.pay.testMode}</p>}
        </>
      ) : (
        <div className="mt-8 max-w-md rounded-2xl bg-pink-soft px-6 py-5 text-[14px] text-ink-soft">{t.pay.unavailable}</div>
      )}
      <Link href={href("/")} className="mt-8 text-[13px] text-muted hover:text-ink">
        ← {t.checkout.backHome}
      </Link>
    </div>
  );
}
