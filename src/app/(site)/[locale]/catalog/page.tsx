import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import { loadProducts } from "@/lib/products";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "ru");
  return { title: t.catalog.title };
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const l: Locale = isLocale(locale) ? locale : "ru";
  return <CatalogPage locale={l} t={getDictionary(l)} searchParams={sp} products={await loadProducts()} />;
}
