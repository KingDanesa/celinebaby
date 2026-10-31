"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/ProductCard";
import { useI18n } from "@/components/providers/I18nProvider";

export function NewSlider({ products }: { products: Product[] }) {
  const { t, href } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const w = card ? card.offsetWidth + 16 : el.clientWidth / 2;
    el.scrollBy({ left: dir * w * 2, behavior: "smooth" });
  };
  if (products.length === 0) return null;
  return (
    <section className="container-x py-14 sm:py-20">
      <div className="mb-6 flex items-end justify-between sm:mb-8">
        <h2 className="text-[28px] font-semibold leading-none sm:text-[36px]">{t.home.newTitle}</h2>
        <div className="flex items-center gap-3">
          <Link href={href("/catalog/new")} className="link-underline hidden text-[11px] font-semibold uppercase tracking-[0.14em] sm:inline">
            {t.home.seeAll}
          </Link>
          <button type="button" aria-label={t.catalog.prev} onClick={() => scroll(-1)} className="flex h-9 w-9 items-center justify-center rounded-md bg-pink text-ink transition hover:bg-pink-deep">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label={t.catalog.next} onClick={() => scroll(1)} className="flex h-9 w-9 items-center justify-center rounded-md bg-pink text-ink transition hover:bg-pink-deep">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {products.map((p, i) => (
          <div key={p.id} data-card className="w-[72vw] shrink-0 snap-start sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]">
            <ProductCard product={p} tone={i % 2 ? "blue" : "pink"} badge="new" />
          </div>
        ))}
      </div>
      <Link href={href("/catalog/new")} className="btn-outline mt-6 w-full sm:hidden">
        {t.home.seeAll}
      </Link>
    </section>
  );
}
