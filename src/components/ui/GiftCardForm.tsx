"use client";

import { useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn, formatPrice } from "@/lib/format";
import { Monogram, Wordmark } from "./Logo";

const AMOUNTS = [10000, 20000, 30000, 50000, 100000];

export function GiftCardForm() {
  const { t } = useI18n();
  const g = t.pages.gift;
  const [amount, setAmount] = useState(20000);
  const [format, setFormat] = useState(g.formats[0].id);
  const [done, setDone] = useState(false);

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <div className="relative aspect-[1.6] overflow-hidden rounded-[28px] bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800 p-8 text-white shadow-2xl shadow-rose-900/20">
          <Monogram size={420} className="pointer-events-none absolute -right-20 -top-28 opacity-20" />
          <div className="relative flex h-full flex-col justify-between">
            <Wordmark width={140} className="brightness-0 invert" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">{g.title}</p>
              <p className="mt-1 font-display text-[40px] font-semibold leading-none sm:text-[52px]">{formatPrice(amount)}</p>
            </div>
          </div>
        </div>
      </div>

      <form
        className="flex flex-col gap-7 lg:col-span-6"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(true);
        }}
      >
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em]">{g.amount}</p>
          <div className="flex flex-wrap gap-2">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                className={cn("rounded-full border px-4 py-2 text-[14px] font-medium transition", amount === a ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink")}
              >
                {formatPrice(a)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em]">{g.format}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.formats.map((f) => (
              <label key={f.id} className={cn("cursor-pointer rounded-2xl border bg-white p-4 transition", format === f.id ? "border-ink ring-1 ring-ink" : "border-line hover:border-ink/40")}>
                <input type="radio" name="format" className="sr-only" checked={format === f.id} onChange={() => setFormat(f.id)} />
                <span className="block text-[14px] font-semibold">{f.title}</span>
                <span className="block text-[12px] text-muted">{f.text}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em]">{g.recipient}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="to" placeholder={t.checkout.name} className="input" />
            <input name="email" type="email" placeholder={t.checkout.email} className="input" />
          </div>
        </div>
        {done ? (
          <p className="rounded-2xl bg-rose-50 px-5 py-4 text-[14px] text-rose-800">{t.checkout.demoNote}</p>
        ) : (
          <button type="submit" className="btn-primary w-fit">
            {g.cta} · {formatPrice(amount)}
          </button>
        )}
      </form>
    </div>
  );
}
