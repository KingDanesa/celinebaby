"use client";

import { useState, useTransition } from "react";
import { Check, Tag, X } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { applyPromoAction } from "@/lib/actions/promo";

/** "Промокод" field: checks the code on the server and keeps it in the cart. */
export function PromoField() {
  const { t, locale } = useI18n();
  const { promo, setPromo } = useCart();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (promo) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-mint px-3 py-2 text-[13px]">
        <span className="flex items-center gap-1.5">
          <Check className="h-4 w-4" />
          {t.cart.promoApplied}: <b className="tracking-wide">{promo.code}</b> · −{promo.percent}%
        </span>
        <button type="button" onClick={() => setPromo(null)} className="flex items-center gap-1 text-[12px] text-ink-soft hover:text-ink" aria-label={t.cart.promoRemove}>
          <X className="h-3.5 w-3.5" /> {t.cart.promoRemove}
        </button>
      </div>
    );
  }

  const apply = () => {
    setError(null);
    start(async () => {
      const res = await applyPromoAction(value, locale);
      if (res.ok) {
        setPromo({ code: res.code, percent: res.percent });
        setValue("");
      } else setError(res.error);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
            placeholder={t.cart.promoPlaceholder}
            aria-label={t.cart.promo}
            autoComplete="off"
            className="input py-2.5 pl-9 uppercase"
          />
        </div>
        <button type="button" onClick={apply} disabled={pending || !value.trim()} className="btn-outline shrink-0 px-4 py-2.5 text-[12px]">
          {pending ? "…" : t.cart.promoApply}
        </button>
      </div>
      {error && <p className="text-[12px] text-rose-700">{error}</p>}
    </div>
  );
}
