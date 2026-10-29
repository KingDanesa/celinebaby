import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift, RotateCcw, Truck } from "lucide-react";
import { getDictionary } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { relatedProducts } from "@/lib/catalog";
import { findProduct, loadProducts } from "@/lib/products";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductBuyBox } from "@/components/product/ProductBuyBox";
import { Price } from "@/components/product/Price";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await findProduct(slug);
  return { title: p?.name ?? "Celine Baby" };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const l: Locale = isLocale(locale) ? locale : "ru";
  const t = getDictionary(l);
  const href = (p: string) => `/${l}${p}`;
  const product = await findProduct(slug);
  if (!product) notFound();
  const related = relatedProducts(await loadProducts(), product, 8);

  const specs = [
    product.composition && { k: t.product.composition, v: product.composition },
    product.lining && { k: t.product.lining, v: product.lining },
    product.care && { k: t.product.care, v: product.care },
    product.brand && { k: t.product.brand, v: product.brand },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div className="container-x pt-5 sm:pt-8">
      <Breadcrumbs
        items={[
          { label: t.catalog.breadcrumbHome, href: href("/") },
          { label: t.catalog.title, href: href("/catalog") },
          { label: t.categories[product.category], href: href(`/catalog/${product.category}`) },
          { label: product.name },
        ]}
      />

      <div className="mt-5 grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <ProductGallery images={product.images} imagesFull={product.imagesFull} alt={product.name} />
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[100px]">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
              {product.tags.includes("new") && <span className="rounded-full bg-sand px-2.5 py-1 text-ink">{t.catalog.tagNew}</span>}
              {product.tags.includes("hit") && <span className="rounded-full bg-rose-600 px-2.5 py-1 text-white">{t.catalog.tagHit}</span>}
              {product.brand && <span className="rounded-full border border-line px-2.5 py-1 text-muted">{product.brand}</span>}
            </div>
            <h1 className="mt-3 text-[26px] leading-tight font-semibold sm:text-[32px]">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
              {product.sku && (
                <span>
                  {t.product.sku}: {product.sku}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t.product.inStock}
              </span>
            </div>
            <Price price={product.price} oldPrice={product.oldPrice} size="lg" className="mt-5" />

            <div className="mt-7">
              <ProductBuyBox product={product} />
            </div>

            <ul className="mt-7 grid gap-3 rounded-2xl bg-sand p-4 text-[13px] text-ink-soft sm:grid-cols-1">
              <li className="flex gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{t.product.deliveryText}</span>
              </li>
              <li className="flex gap-3">
                <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{t.product.returnsText}</span>
              </li>
              <li className="flex gap-3">
                <Gift className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{t.product.gift}</span>
              </li>
            </ul>

            {(product.description || specs.length > 0) && (
              <div className="mt-8 border-t border-line">
                {product.description && (
                  <details open className="group border-b border-line py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold">
                      {t.product.description}
                      <span className="text-muted transition group-open:rotate-45">+</span>
                    </summary>
                    <div className="prose-soft mt-3 text-[14px]" dangerouslySetInnerHTML={{ __html: product.description }} />
                  </details>
                )}
                {specs.length > 0 && (
                  <details className="group border-b border-line py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-semibold">
                      {t.product.composition} / {t.product.care}
                      <span className="text-muted transition group-open:rotate-45">+</span>
                    </summary>
                    <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-2 text-[14px]">
                      {specs.map((s) => (
                        <div key={s.k} className="contents">
                          <dt className="text-muted">{s.k}</dt>
                          <dd className="text-ink-soft">{s.v}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20 sm:mt-28">
          <SectionHeading title={t.product.related} href={href(`/catalog/${product.category}`)} linkLabel={t.product.alsoCategory} />
          <ProductGrid products={related} />
        </section>
      )}
      <div className="mt-6 text-center">
        <Link href={href("/catalog")} className="text-[13px] text-muted hover:text-rose-700">
          ← {t.nav.allCatalog}
        </Link>
      </div>
    </div>
  );
}
