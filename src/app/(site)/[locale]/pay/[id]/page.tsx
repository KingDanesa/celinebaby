import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pageContext } from "@/lib/page";
import { getStore } from "@/lib/store";
import { halykConfig, halykEnabled, invoiceToken } from "@/lib/payment/halyk";
import { syncPaymentStatus } from "@/lib/actions/orders";
import { HalykWidget } from "@/components/cart/HalykWidget";
import { formatPrice } from "@/lib/format";
import { Monogram } from "@/components/ui/Logo";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  const { locale, t, href } = await pageContext(params);
  const store = await getStore();
  let order = await store.getOrder(id);
  if (!order) notFound();
  if (order.paymentStatus === "pending") order = (await syncPaymentStatus(id)) ?? order;
  if (order.paymentStatus === "paid") redirect(href(`/checkout/success?order=${id}`));

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const cfg = halykConfig();
  let auth: Awaited<ReturnType<typeof invoiceToken>> | null = null;
  let error: string | null = null;
  if (halykEnabled() && order.invoiceId) {
    try {
      auth = await invoiceToken({
        invoiceId: order.invoiceId,
        amount: order.subtotal,
        postLink: `${site}/api/payment/halyk/callback`,
        failurePostLink: `${site}/api/payment/halyk/callback`,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      console.error("[halyk]", e);
    }
  }

  return (
    <div className="container-x flex flex-col items-center py-16 text-center sm:py-24">
      <Monogram size={72} className="opacity-40" />
      <h1 className="mt-5 text-[28px] font-semibold sm:text-[36px]">{t.pay.title}</h1>
      <p className="mt-2 text-[14px] text-muted">
        {t.checkout.orderNumber}: <span className="font-semibold text-ink">{order.id}</span>
      </p>
      <p className="mt-5 text-[13px] uppercase tracking-[0.14em] text-muted">{t.pay.amount}</p>
      <p className="mt-1 text-[32px] font-semibold tabular-nums">{formatPrice(order.subtotal)}</p>

      {auth && order.invoiceId ? (
        <>
          <p className="mt-6 max-w-md text-[14px] text-ink-soft">{t.pay.text}</p>
          <HalykWidget
            scriptUrl={cfg.paymentJs}
            payment={{
              invoiceId: order.invoiceId,
              backLink: `${site}${href(`/checkout/success?order=${order.id}`)}`,
              failureBackLink: `${site}${href(`/checkout/success?order=${order.id}&failed=1`)}`,
              postLink: `${site}/api/payment/halyk/callback`,
              failurePostLink: `${site}/api/payment/halyk/callback`,
              language: locale === "kk" ? "kaz" : "rus",
              description: `Celine Baby, заказ ${order.id}`,
              accountId: order.id,
              terminal: cfg.terminal,
              amount: order.subtotal,
              currency: "KZT",
              auth,
              email: order.customer.email,
              phone: order.customer.phone,
            }}
            labels={{ open: t.pay.open, opening: t.pay.opening }}
          />
          {cfg.test && <p className="mt-4 rounded-xl bg-cream px-4 py-2 text-[12px] text-ink-soft">{t.pay.testMode}</p>}
        </>
      ) : (
        <div className="mt-8 max-w-md rounded-2xl bg-pink-soft px-6 py-5 text-[14px] text-ink-soft">
          {t.pay.unavailable}
          {error && <p className="mt-2 text-[11px] text-muted">{error}</p>}
        </div>
      )}
      <Link href={href("/")} className="mt-8 text-[13px] text-muted hover:text-ink">
        ← {t.checkout.backHome}
      </Link>
    </div>
  );
}
