"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { imageUrl, cn } from "@/lib/format";
import { useI18n } from "@/components/providers/I18nProvider";
import { useCart } from "@/components/providers/CartProvider";
import { Price } from "./Price";
import { sortSizes } from "@/lib/catalog";

export function ProductCard({
  product,
  priority = false,
  className,
  tone = "pink",
  badge,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
  /** Pastel background behind the photo, alternated in grids like the approved layout. */
  tone?: "pink" | "blue";
  /** Force the "Новинка" label (home slider). */
  badge?: "new";
}) {
  const { t, href } = useI18n();
  const { toggleWishlist, inWishlist, hydrated } = useCart();
  const [hover, setHover] = useState(false);
  const wished = hydrated && inWishlist(product.id);
  const second = product.images[1];
  const sizes = sortSizes(product.sizes);

  return (
    <article
      className={cn("group relative flex flex-col", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link href={href(`/product/${product.slug}`)} className={cn("relative block overflow-hidden rounded-xl", tone === "blue" ? "bg-blue-soft" : "bg-pink-soft")}>
        <div className="relative aspect-[4/5] w-full">
          <Image
            src={imageUrl(product.images[0])}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className={cn(
              "object-cover transition-all duration-700 ease-soft",
              second && hover ? "scale-[1.03] opacity-0" : "scale-100 opacity-100",
            )}
          />
          {second && (
            <Image
              src={imageUrl(second)}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-cover transition-all duration-700 ease-soft",
                hover ? "scale-[1.03] opacity-100" : "scale-100 opacity-0",
              )}
            />
          )}
        </div>
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {(badge === "new" || product.showInNew) && <Tag>{t.catalog.tagNew}</Tag>}
          {product.tags.includes("hit") && <Tag tone="rose">{t.catalog.tagHit}</Tag>}
          {product.tags.includes("sale") && <Tag tone="dark">{t.catalog.tagSale}</Tag>}
        </div>
        {sizes.length > 0 && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-2 flex-wrap gap-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:flex">
            {sizes.slice(0, 6).map((s) => (
              <span key={s} className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-ink backdrop-blur">
                {s}
              </span>
            ))}
            {sizes.length > 6 && (
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-muted backdrop-blur">
                +{sizes.length - 6}
              </span>
            )}
          </div>
        )}
      </Link>
      <button
        type="button"
        aria-label={wished ? t.product.inWishlist : t.product.wishlist}
        aria-pressed={wished}
        onClick={() => toggleWishlist(product.id)}
        className={cn(
          "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white",
          wished ? "text-rose-600" : "text-ink/70",
        )}
      >
        <Heart className={cn("h-[18px] w-[18px]", wished && "fill-current")} />
      </button>
      <div className="mt-3 flex flex-col gap-1 px-0.5">
        <Link href={href(`/product/${product.slug}`)} className="line-clamp-2 text-[14px] leading-snug text-ink hover:text-rose-700">
          {product.name}
        </Link>
        <div className="flex items-center justify-between gap-2">
          <Price price={product.price} oldPrice={product.oldPrice} size="sm" />
          {product.colors.length > 1 && (
            <span className="flex -space-x-1">
              {product.colors.slice(0, 4).map((c) => (
                <span
                  key={c.name}
                  title={c.name}
                  className="h-3.5 w-3.5 rounded-full border border-white ring-1 ring-black/5"
                  style={{ background: c.hex }}
                />
              ))}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function Tag({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "rose" | "dark" }) {
  const tones = {
    light: "bg-white/90 text-ink",
    rose: "bg-rose-600 text-white",
    dark: "bg-ink text-white",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur", tones[tone])}>
      {children}
    </span>
  );
}
