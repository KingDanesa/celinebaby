import type { Metadata } from "next";
import { CreditCard, RotateCcw, Truck } from "lucide-react";
import { pageContext } from "@/lib/page";
import { PageHeader } from "@/components/ui/PageHeader";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.pages.delivery.title };
}

export default async function DeliveryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href } = await pageContext(params);
  const d = t.pages.delivery;
  return (
    <>
      <PageHeader title={d.title} crumbs={[{ label: t.catalog.breadcrumbHome, href: href("/") }, { label: d.title }]} />
      <div className="container-x mt-10 grid gap-12 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <ul className="sticky top-[100px] flex flex-col gap-2 text-[14px]">
            {[
              ["#delivery", d.deliveryTitle],
              ["#payment", d.paymentTitle],
              ["#returns", d.returnsTitle],
            ].map(([h, l]) => (
              <li key={h}>
                <a href={h} className="text-ink-soft hover:text-rose-700">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </aside>
        <div className="flex flex-col gap-14 lg:col-span-9">
          <section id="delivery" className="scroll-mt-28">
            <h2 className="flex items-center gap-3 text-[24px] font-semibold">
              <Truck className="h-6 w-6 text-rose-600" /> {d.deliveryTitle}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {d.methods.map((m) => (
                <div key={m.title} className="rounded-2xl border border-line bg-white p-5">
                  <p className="font-semibold">{m.title}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{m.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-2xl bg-rose-50 px-5 py-4 text-[14px] font-medium text-rose-800">{d.freeNote}</p>
          </section>

          <section id="payment" className="scroll-mt-28">
            <h2 className="flex items-center gap-3 text-[24px] font-semibold">
              <CreditCard className="h-6 w-6 text-rose-600" /> {d.paymentTitle}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {d.payments.map((p) => (
                <li key={p} className="flex items-start gap-3 rounded-2xl bg-sand px-5 py-4 text-[14px] text-ink-soft">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" /> {p}
                </li>
              ))}
            </ul>
          </section>

          <section id="returns" className="scroll-mt-28">
            <h2 className="flex items-center gap-3 text-[24px] font-semibold">
              <RotateCcw className="h-6 w-6 text-rose-600" /> {d.returnsTitle}
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{d.returnsText}</p>
          </section>
        </div>
      </div>
    </>
  );
}
