import { getDictionary } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { loadProducts } from "@/lib/products";
import { getNewArrivals } from "@/lib/catalog";
import { NEW_SLIDER_LIMIT } from "@/data/categories";
import { loadPosts } from "@/lib/blog";
import { getHome } from "@/lib/home";
import { HeroTiles } from "@/components/home/Hero";
import { Benefits, BlogTeasers, CategoryTiles, DischargeTile, StoreTile } from "@/components/home/Sections";
import { NewSlider } from "@/components/home/NewSlider";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? (locale as Locale) : "ru");
  const href = (p: string) => `/${locale}${p}`;
  const products = await loadProducts();
  const fresh = getNewArrivals(products, NEW_SLIDER_LIMIT);
  const [posts, home] = await Promise.all([loadPosts(locale), getHome()]);

  return (
    <div className="flush-footer">
      {/* Desktop order follows the desktop layout; on phones blocks are reordered like the mobile layout. */}
      <div className="flex flex-col sm:grid sm:grid-cols-2">
        <HeroTiles home={home} locale={locale} href={href} />
      </div>
      <CategoryTiles home={home} locale={locale} href={href} />
      <div className="sm:hidden">
        <StoreTile home={home} locale={locale} />
      </div>
      <NewSlider products={fresh} />
      <div className="grid sm:grid-cols-2">
        <DischargeTile home={home} locale={locale} href={href} />
        <div className="hidden sm:block">
          <StoreTile home={home} locale={locale} />
        </div>
      </div>
      <Benefits home={home} locale={locale} />
      {posts.length > 0 && <BlogTeasers t={t} href={href} posts={posts} />}
    </div>
  );
}
