"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { formatPrice, imageUrl } from "@/lib/format";
import { FREE_DELIVERY_FROM } from "@/data/categories";

export function CartPage() {
  const { t, href } = useI18n();
  const { items, subtotal, setQty, remove, count, hydrated } = useCart();

  if (!hydrated) return <div className="container-x py-20" />;

  if (items.length === 0)
    return (
      <div className="container-x flex flex-col items-center py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-[28px] font-semibold">{t.cart.empty}</h1>
        <p className="mt-2 text-muted">{t.cart.emptyHint}</p>
        <Link href={href("/catalog")} className="btn-primary mt-8">
          {t.cart.goCatalog}
        </Link>
      </div>
    );

  const free = subtotal >= FREE_DELIVERY_FROM;

  return (
    <div className="container-x pt-6 sm:pt-10">
      <h1 className="text-[30px] font-semibold sm:text-[40px]">
        {t.cart.title} <span className="text-muted">({count})</span>
      </h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-12">
        <ul className="divide-y divide-line lg:col-span-8">
          {items.map((i) => (
            <li key={i.key} className="flex gap-4 py-5 sm:gap-6">
              <Link href={href(`/product/${i.slug}`)} className="relative h-32 w-24 shrink-0 overflow-hidden rounded-2xl bg-sand sm:h-40 sm:w-32">
                <Image src={imageUrl(i.image)} alt="" fill sizes="128px" className="object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={href(`/product/${i.slug}`)} className="text-[15px] font-medium leading-snug hover:text-rose-700">
                      {i.name}
                    </Link>
                    <p className="mt-1 text-[13px] text-muted">{[i.color, i.size].filter(Boolean).join(" · ")}</p>
                  </div>
                  <button type="button" onClick={() => remove(i.key)} aria-label={t.cart.remove} className="p-1 text-muted hover:text-rose-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-full border border-line">
                    <button type="button" onClick={() => setQty(i.key, i.qty - 1)} className="p-2 text-muted hover:text-ink" aria-label="-">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm tabular-nums">{i.qty}</span>
                    <button type="button" onClick={() => setQty(i.key, i.qty + 1)} className="p-2 text-muted hover:text-ink" aria-label="+">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-semibold tabular-nums">{formatPrice(i.price * i.qty)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:col-span-4">
          <div className="sticky top-[100px] rounded-3xl bg-sand p-6">
            <div className="flex justify-between text-[14px]">
              <span className="text-muted">{t.cart.subtotal}</span>
              <span className="tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-[14px]">
              <span className="text-muted">{t.cart.delivery}</span>
              <span className={free ? "font-semibold text-rose-700" : "text-muted"}>{free ? t.cart.deliveryFree : t.cart.deliveryCalc}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-line pt-4 text-[17px] font-semibold">
              <span>{t.cart.total}</span>
              <span className="tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <Link href={href("/checkout")} className="btn-primary mt-6 w-full">
              {t.cart.checkout}
            </Link>
            <Link href={href("/catalog")} className="mt-3 block text-center text-[13px] text-muted hover:text-ink">
              {t.cart.continue}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
