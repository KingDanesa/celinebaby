import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import { isCategorySlug, isPresetSlug } from "@/data/categories";
import { loadProducts } from "@/lib/products";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "ru");
  const title = isCategorySlug(slug)
    ? t.categories[slug]
    : isPresetSlug(slug)
      ? { girls: t.nav.girls, boys: t.nav.boys, newborn: t.nav.newborn, toddler: t.nav.toddler, new: t.nav.new, hits: t.nav.hits, sale: t.catalog.tagSale }[slug]
      : t.catalog.title;
  return { title };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!isCategorySlug(slug) && !isPresetSlug(slug)) notFound();
  const sp = await searchParams;
  const l: Locale = isLocale(locale) ? locale : "ru";
  return <CatalogPage locale={l} t={getDictionary(l)} slug={slug} searchParams={sp} products={await loadProducts()} />;
}
