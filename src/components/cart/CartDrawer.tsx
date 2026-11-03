"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { formatPrice, imageUrl } from "@/lib/format";
import { FREE_DELIVERY_FROM } from "@/data/categories";

export function CartDrawer() {
  const { isOpen, close, items, subtotal, discount, total, promo, setQty, remove, count } = useCart();
  const { t, href } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  if (!isOpen) return null;
  const left = Math.max(0, FREE_DELIVERY_FROM - subtotal);
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_FROM) * 100);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={close} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right">
        <div className="flex h-[68px] items-center justify-between border-b border-line px-5">
          <h2 className="text-lg font-semibold">
            {t.cart.title} {count > 0 && <span className="text-muted">({count})</span>}
          </h2>
          <button type="button" aria-label={t.nav.close} onClick={close} className="-mr-2 p-2 text-muted hover:text-ink">
            <X className="h-6 w-6" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <p className="font-display text-lg font-semibold">{t.cart.empty}</p>
            <p className="text-sm text-muted">{t.cart.emptyHint}</p>
            <Link href={href("/catalog")} onClick={close} className="btn-primary mt-2">
              {t.cart.goCatalog}
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-5 py-3">
              <p className="text-[12px] text-muted">
                {left > 0 ? (
                  <>
                    {t.cart.freeDeliveryLeft} <span className="font-semibold text-ink">{formatPrice(left)}</span>
                  </>
                ) : (
                  <span className="font-semibold text-rose-700">{t.cart.freeDeliveryDone}</span>
                )}
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sand">
                <div className="h-full rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {items.map((i) => (
                <li key={i.key} className="flex gap-4 py-4">
                  <Link href={href(`/product/${i.slug}`)} onClick={close} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-sand">
                    <Image src={imageUrl(i.image)} alt="" fill sizes="80px" className="object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link href={href(`/product/${i.slug}`)} onClick={close} className="line-clamp-2 text-[14px] leading-snug hover:text-rose-700">
                      {i.name}
                    </Link>
                    <p className="mt-1 text-[12px] text-muted">
                      {[i.color, i.size].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-line">
                        <button type="button" onClick={() => setQty(i.key, i.qty - 1)} className="p-1.5 text-muted hover:text-ink" aria-label="-">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm tabular-nums">{i.qty}</span>
                        <button type="button" onClick={() => setQty(i.key, i.qty + 1)} className="p-1.5 text-muted hover:text-ink" aria-label="+">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{formatPrice(i.price * i.qty)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(i.key)} aria-label={t.cart.remove} className="self-start p-1 text-muted hover:text-rose-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-5">
              <div className="mb-4 flex items-center justify-between text-[15px]">
                <span className="text-muted">{discount > 0 && promo ? `${t.cart.total} · ${promo.code} −${promo.percent}%` : t.cart.subtotal}</span>
                <span className="font-semibold tabular-nums">{formatPrice(discount > 0 ? total : subtotal)}</span>
              </div>
              <Link href={href("/checkout")} onClick={close} className="btn-primary w-full">
                {t.cart.checkout}
              </Link>
              <Link href={href("/cart")} onClick={close} className="mt-2 block text-center text-[13px] text-muted hover:text-ink">
                {t.cart.title} →
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
