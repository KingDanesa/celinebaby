"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/format";
import { useCart } from "@/components/providers/CartProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { sortSizes } from "@/lib/catalog";

export function ProductBuyBox({ product }: { product: Product }) {
  const { t, href } = useI18n();
  const { add, toggleWishlist, inWishlist, hydrated } = useCart();
  const sizes = sortSizes(product.sizes);
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(product.colors[0]?.name ?? null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);
  const wished = hydrated && inWishlist(product.id);

  const submit = () => {
    if (sizes.length > 0 && !size) {
      setError(true);
      return;
    }
    add(product, { size, color, qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="flex flex-col gap-6">
      {product.colors.length > 0 && (
        <div>
          <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink">
            {t.product.color}: <span className="font-normal normal-case tracking-normal text-muted">{color}</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-pressed={color === c.name}
                onClick={() => setColor(c.name)}
                className={cn(
                  "h-8 w-8 rounded-full ring-1 ring-black/10 transition",
                  color === c.name && "ring-2 ring-rose-600 ring-offset-2 ring-offset-cream",
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>
      )}

      {sizes.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", error ? "text-rose-700" : "text-ink")}>
              {error ? t.product.chooseSize : t.product.size}
              {size && <span className="font-normal normal-case tracking-normal text-muted">: {size}</span>}
            </p>
            <Link href={href("/sizes")} className="text-[12px] text-muted underline-offset-2 hover:text-rose-700 hover:underline">
              {t.product.sizeGuide}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                onClick={() => {
                  setSize(s);
                  setError(false);
                }}
                className={cn(
                  "min-w-12 rounded-full border px-4 py-2 text-[13px] font-medium transition",
                  size === s ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink",
                  error && "border-rose-300",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-12 items-center justify-between rounded-full border border-line bg-white px-2 sm:w-32">
          <button type="button" aria-label="-" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2 text-muted hover:text-ink">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
          <button type="button" aria-label="+" onClick={() => setQty((q) => q + 1)} className="p-2 text-muted hover:text-ink">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={submit} className={cn("btn-dark h-12 flex-1 text-[14px]", added && "bg-rose-600 hover:bg-rose-600")}>
          {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
          {added ? t.product.added : t.product.addToCart}
        </button>
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={wished}
          className={cn("btn-outline h-12 px-4", wished && "border-rose-600 text-rose-700")}
          aria-label={t.product.wishlist}
        >
          <Heart className={cn("h-4 w-4", wished && "fill-current")} />
          <span className="sm:hidden">{wished ? t.product.inWishlist : t.product.wishlist}</span>
        </button>
      </div>
    </div>
  );
}
