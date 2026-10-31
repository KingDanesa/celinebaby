import Link from "next/link";
import { Check, Clock, XCircle } from "lucide-react";
import { pageContext } from "@/lib/page";
import { getStore } from "@/lib/store";
import { syncPaymentStatus } from "@/lib/actions/orders";
import { Monogram } from "@/components/ui/Logo";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string; failed?: string }>;
}) {
  const { t, href } = await pageContext(params);
  const { order: id } = await searchParams;
  const store = await getStore();
  let order = id ? await store.getOrder(id) : null;
  if (order && order.payment === "halyk" && order.paymentStatus !== "paid") {
    order = (await syncPaymentStatus(order.id)) ?? order;
  }

  const state = !order ? "kaspi" : order.payment !== "halyk" ? "kaspi" : order.paymentStatus === "paid" ? "paid" : order.paymentStatus === "failed" ? "failed" : "pending";
  const text = { paid: t.checkout.successPaid, pending: t.checkout.successPending, kaspi: t.checkout.successKaspi, failed: t.checkout.successFailed }[state];
  const Icon = state === "failed" ? XCircle : state === "pending" ? Clock : Check;
  const tone = state === "failed" ? "bg-rose-700" : state === "pending" ? "bg-ink" : "bg-burgundy";

  return (
    <div className="container-x flex flex-col items-center py-20 text-center sm:py-28">
      <div className="relative">
        <Monogram size={120} className="opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${tone}`}>
            <Icon className="h-6 w-6" />
          </span>
        </div>
      </div>
      <h1 className="mt-6 text-[32px] font-semibold sm:text-[40px]">{state === "failed" ? t.pay.title : t.checkout.successTitle}</h1>
      <p className="mt-3 max-w-md text-muted">{text}</p>
      {order && (
        <p className="mt-6 rounded-full bg-pink-soft px-5 py-2 text-[14px]">
          {t.checkout.orderNumber}: <span className="font-semibold">{order.id}</span> · {formatPrice(order.subtotal)}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {order && (state === "failed" || state === "pending") && (
          <Link href={href(state === "failed" ? `/pay/${order.id}` : `/checkout/success?order=${order.id}`)} className="btn-primary">
            {state === "failed" ? t.checkout.payAgain : t.checkout.checkStatus}
          </Link>
        )}
        {order?.userId && (
          <Link href={href("/account")} className="btn-outline">
            {t.checkout.toAccount}
          </Link>
        )}
        <Link href={href("/")} className={order && (state === "failed" || state === "pending") ? "btn-outline" : "btn-primary"}>
          {t.checkout.backHome}
        </Link>
      </div>
    </div>
  );
}
