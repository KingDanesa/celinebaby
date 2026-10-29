import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { WishlistPage } from "@/components/product/WishlistPage";
import { loadProducts } from "@/lib/products";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : "ru").wishlist.title };
}

export default async function Page() {
  // Pass a slim index so the client can resolve wishlist ids without the full dataset.
  const products = await loadProducts();
  const index = products.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, price: p.price, oldPrice: p.oldPrice, images: p.images.slice(0, 2),
    colors: p.colors.slice(0, 4), sizes: p.sizes, tags: p.tags, category: p.category, gender: p.gender, ages: p.ages,
  }));
  return <WishlistPage index={index} />;
}
