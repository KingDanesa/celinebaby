"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { ProductGrid } from "./ProductGrid";
import type { Product } from "@/lib/types";

type Slim = Pick<Product, "id" | "slug" | "name" | "price" | "oldPrice" | "images" | "colors" | "sizes" | "tags" | "category" | "gender" | "ages">;

export function WishlistPage({ index }: { index: Slim[] }) {
  const { t, href } = useI18n();
  const { wishlist, hydrated } = useCart();
  if (!hydrated) return <div className="container-x py-20" />;
  const byId = new Map(index.map((p) => [p.id, p]));
  const items = wishlist.map((id) => byId.get(id)).filter(Boolean) as Slim[];

  return (
    <div className="container-x pt-6 sm:pt-10">
      <h1 className="text-[30px] font-semibold sm:text-[40px]">
        {t.wishlist.title} {items.length > 0 && <span className="text-muted">({items.length})</span>}
      </h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <Heart className="h-8 w-8" />
          </div>
          <p className="mt-6 font-display text-xl font-semibold">{t.wishlist.empty}</p>
          <p className="mt-2 text-muted">{t.wishlist.emptyHint}</p>
          <Link href={href("/catalog")} className="btn-primary mt-8">
            {t.cart.goCatalog}
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <ProductGrid products={items as Product[]} />
        </div>
      )}
    </div>
  );
}
