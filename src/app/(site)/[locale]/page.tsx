import { getDictionary } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { getMenuData } from "@/lib/menu";
import { loadProducts } from "@/lib/products";
import { getHits, getNewArrivals, filterProducts } from "@/lib/catalog";
import { blogPosts } from "@/data/blog";
import { Hero } from "@/components/home/Hero";
import { AgeSplit, Benefits, BlogTeasers, BrandQuote, CategoryRow, DischargeBanner, GiftBanner } from "@/components/home/Sections";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductGrid } from "@/components/product/ProductGrid";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? (locale as Locale) : "ru");
  const href = (p: string) => `/${locale}${p}`;
  const products = await loadProducts();
  const menu = getMenuData(products);
  const discharge = filterProducts(products, { category: "nabory-na-vypisku" }).find((p) => p.images.length > 1);
  const hits = getHits(products);
  const hitList = hits.length >= 8 ? hits.slice(0, 8) : filterProducts(products, { sort: "popular" }).slice(0, 8);

  return (
    <>
      <Hero t={t} href={href} />
      <AgeSplit t={t} href={href} menu={menu} />
      <CategoryRow t={t} href={href} menu={menu} />

      <section className="container-x mt-16 sm:mt-24">
        <SectionHeading title={t.home.hitsTitle} subtitle={t.home.hitsSubtitle} href={href("/catalog/hits")} linkLabel={t.home.seeAll} />
        <ProductGrid products={hitList} />
      </section>

      <DischargeBanner t={t} href={href} product={discharge} />

      <section className="container-x mt-16 sm:mt-24">
        <SectionHeading title={t.home.newTitle} subtitle={t.home.newSubtitle} href={href("/catalog/new")} linkLabel={t.home.seeAll} />
        <ProductGrid products={getNewArrivals(products, 8)} />
      </section>

      <BrandQuote t={t} />
      <Benefits t={t} />
      <GiftBanner t={t} href={href} />
      <BlogTeasers t={t} href={href} posts={blogPosts} />
    </>
  );
}
