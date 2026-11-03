import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listPromos, promoState, todayAstana, type PromoState } from "@/lib/promo";
import { dbEnabled } from "@/lib/db";
import { Card, PageTitle } from "@/components/admin/ui";
import { PromoForm, PromoRowActions } from "@/components/admin/PromoForms";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Промокоды" };

const STATE: Record<PromoState, { label: string; cls: string }> = {
  active: { label: "действует", cls: "bg-mint text-ink" },
  scheduled: { label: "ещё не начался", cls: "bg-blue-soft text-ink" },
  expired: { label: "закончился", cls: "bg-sand text-muted" },
  off: { label: "выключен", cls: "bg-sand text-muted" },
};
const ru = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function PromosPage() {
  await requireAdmin();
  const today = todayAstana();
  const promos = await listPromos();
  return (
    <>
      <PageTitle title="Промокоды" subtitle="Скидка в процентах на товары в корзине. Покупатель вводит промокод в корзине или при оформлении заказа." />
      {!dbEnabled() && (
        <Card className="mb-6">
          <p className="text-[14px] text-ink-soft">Промокоды работают на боевом сервере.</p>
        </Card>
      )}
      <Card title="Новый промокод" className="mb-6">
        <PromoForm today={today} />
        <p className="mt-3 text-[12px] text-muted">
          Промокод работает с 00:00 первого дня до 23:59 последнего дня по времени Астаны. Большие и маленькие буквы не различаются: winter и WINTER — один код.
        </p>
      </Card>
      <div className="flex flex-col gap-3">
        {promos.map((p) => {
          const st = STATE[promoState(p, today)];
          return (
            <Card key={p.code}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-[18px] font-semibold tracking-wide">{p.code}</span>
                    <span className="rounded-full bg-burgundy px-2.5 py-0.5 text-[13px] font-semibold text-white">−{p.percent}%</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] ${st.cls}`}>{st.label}</span>
                  </p>
                  <p className="mt-1 text-[13px] text-ink-soft">
                    с {ru(p.startsOn)} по {ru(p.endsOn)}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    Заказов с промокодом: {p.orders ?? 0}
                    {p.paidOrders ? ` · оплачено ${p.paidOrders} на ${formatPrice(p.revenue ?? 0)}` : ""}
                  </p>
                </div>
                <PromoRowActions promo={{ code: p.code, percent: p.percent, startsOn: p.startsOn, endsOn: p.endsOn, active: p.active, note: p.note }} today={today} />
              </div>
            </Card>
          );
        })}
        {promos.length === 0 && dbEnabled() && (
          <Card>
            <p className="py-6 text-center text-[14px] text-muted">Промокодов пока нет</p>
          </Card>
        )}
      </div>
    </>
  );
}
