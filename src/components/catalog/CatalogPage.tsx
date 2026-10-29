import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { computeFacets, filterProducts, parseQuery } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { isCategorySlug, isPresetSlug } from "@/data/categories";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Filters, FilterSidebar } from "./Filters";
import { SortSelect } from "./SortSelect";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

const PER_PAGE = 24;

export function CatalogPage({
  locale,
  t,
  slug,
  searchParams,
  products,
}: {
  locale: Locale;
  t: Dictionary;
  slug?: string;
  searchParams: Record<string, string | string[] | undefined>;
  products: Product[];
}) {
  const href = (p: string) => `/${locale}${p}`;
  const query = parseQuery(slug, searchParams);
  const all = filterProducts(products, query);
  const facets = computeFacets(products, query);
  const page = Math.max(1, Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page) || 1);
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const items = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  let title = t.catalog.all;
  if (slug && isCategorySlug(slug)) title = t.categories[slug];
  else if (slug && isPresetSlug(slug)) {
    title = { girls: t.nav.girls, boys: t.nav.boys, newborn: t.nav.newborn, toddler: t.nav.toddler, new: t.nav.new, hits: t.nav.hits, sale: t.catalog.tagSale }[slug];
  }
  if (query.q) title = `${t.catalog.searchResults} ${t.catalog.searchFor} «${query.q}»`;

  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "page" || v === undefined) continue;
      p.set(k, Array.isArray(v) ? v.join(",") : v);
    }
    if (n > 1) p.set("page", String(n));
    const base = href(`/catalog${slug ? `/${slug}` : ""}`);
    return `${base}${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <div className="container-x pt-5 sm:pt-8">
      <Breadcrumbs
        items={[
          { label: t.catalog.breadcrumbHome, href: href("/") },
          { label: t.catalog.title, href: slug ? href("/catalog") : undefined },
          ...(slug ? [{ label: title }] : []),
        ]}
      />
      <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[30px] leading-tight font-semibold sm:text-[40px]">{title}</h1>
          <p className="mt-1.5 text-[14px] text-muted">
            {all.length} {t.catalog.products}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Filters facets={facets} query={query} showCategories={!(slug && isCategorySlug(slug))} />
          <SortSelect value={query.sort ?? "popular"} />
        </div>
      </div>

      <div className="mt-8 flex gap-10">
        <aside className="hidden w-[250px] shrink-0 lg:block">
          <div className="sticky top-[92px]">
            <FilterSidebar facets={facets} query={query} showCategories={!(slug && isCategorySlug(slug))} />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          {items.length === 0 ? (
            <div className="rounded-3xl bg-sand px-6 py-20 text-center">
              <p className="font-display text-xl font-semibold">{t.catalog.empty}</p>
              <p className="mt-2 text-[14px] text-muted">{t.catalog.emptyHint}</p>
              <Link href={href("/catalog")} className="btn-primary mt-6">
                {t.nav.allCatalog}
              </Link>
            </div>
          ) : (
            <ProductGrid products={items} cols={4} priorityCount={4} />
          )}

          {pages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
              <PageLink href={pageHref(page - 1)} disabled={page <= 1} label={t.catalog.prev}>
                <ChevronLeft className="h-4 w-4" />
              </PageLink>
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
                .reduce<(number | "…")[]>((acc, n) => {
                  const prev = acc[acc.length - 1];
                  if (typeof prev === "number" && n - prev > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === "…" ? (
                    <span key={`e${i}`} className="px-1 text-muted">
                      …
                    </span>
                  ) : (
                    <Link
                      key={n}
                      href={pageHref(n)}
                      aria-current={n === page ? "page" : undefined}
                      className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium transition ${
                        n === page ? "bg-ink text-white" : "text-ink hover:bg-sand"
                      }`}
                    >
                      {n}
                    </Link>
                  ),
                )}
              <PageLink href={pageHref(page + 1)} disabled={page >= pages} label={t.catalog.next}>
                <ChevronRight className="h-4 w-4" />
              </PageLink>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled)
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full text-muted/40" aria-disabled>
        {children}
      </span>
    );
  return (
    <Link href={href} aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-sand">
      {children}
    </Link>
  );
}
