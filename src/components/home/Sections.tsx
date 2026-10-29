import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, Leaf, ShieldCheck, Truck } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { MenuData } from "@/lib/menu";
import type { Product, BlogPost } from "@/lib/types";
import { imageUrl, cn } from "@/lib/format";
import { Monogram } from "@/components/ui/Logo";
import { SectionHeading } from "@/components/ui/SectionHeading";

type H = (p: string) => string;

export function AgeSplit({ t, href, menu }: { t: Dictionary; href: H; menu: MenuData }) {
  const tiles = [
    { to: "/catalog/newborn", image: menu.ageImages.newborn, title: t.home.newbornCard, hint: t.home.newbornCardHint, big: true },
    { to: "/catalog/toddler", image: menu.ageImages.toddler, title: t.home.toddlerCard, hint: t.home.toddlerCardHint, big: true },
    { to: "/catalog/girls", image: menu.genderImages.girl, title: t.home.girlsCard, hint: "", big: false },
    { to: "/catalog/boys", image: menu.genderImages.boy, title: t.home.boysCard, hint: "", big: false },
  ];
  return (
    <section className="container-x mt-16 sm:mt-24">
      <SectionHeading title={t.home.ageTitle} subtitle={t.home.ageSubtitle} />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-6">
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            href={href(tile.to)}
            className={cn(
              "group relative overflow-hidden rounded-3xl bg-sand",
              tile.big ? "col-span-2 aspect-[16/11] lg:col-span-2 lg:aspect-[4/5]" : "aspect-[4/5] lg:col-span-1",
            )}
          >
            {tile.image && (
              <Image
                src={imageUrl(tile.image)}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-ink/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
              <p className={cn("font-display font-semibold leading-tight", tile.big ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl")}>{tile.title}</p>
              {tile.hint && <p className="mt-1 text-[12px] text-white/85 sm:text-[13px]">{tile.hint}</p>}
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:opacity-100">
                {t.home.seeAll} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CategoryRow({ t, href, menu }: { t: Dictionary; href: H; menu: MenuData }) {
  return (
    <section className="mt-16 sm:mt-24">
      <div className="container-x">
        <SectionHeading title={t.home.categoriesTitle} subtitle={t.home.categoriesSubtitle} href={href("/catalog")} linkLabel={t.nav.allCatalog} />
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-10">
        {menu.categories.map((c) => (
          <Link key={c.slug} href={href(`/catalog/${c.slug}`)} className="group w-[150px] shrink-0 sm:w-[180px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
              {c.image && (
                <Image src={imageUrl(c.image)} alt="" fill sizes="180px" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-105" />
              )}
            </div>
            <p className="mt-3 text-[13.5px] font-semibold leading-tight text-ink group-hover:text-rose-700">{t.categories[c.slug]}</p>
            <p className="text-[12px] text-muted">
              {c.count} {t.catalog.products}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DischargeBanner({ t, href, product }: { t: Dictionary; href: H; product?: Product }) {
  return (
    <section className="container-x mt-16 sm:mt-24">
      <div className="grid overflow-hidden rounded-[32px] bg-rose-50 lg:grid-cols-2">
        <div className="relative flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute inset-0 opacity-50">
            <Image src="/brand/pattern-unicorn.jpg" alt="" fill sizes="50vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-rose-50/70 via-rose-50/85 to-rose-50" />
          </div>
          <div className="relative">
            <p className="eyebrow mb-3">{t.home.dischargeEyebrow}</p>
            <h2 className="text-[30px] leading-tight font-semibold sm:text-[40px]">{t.home.dischargeTitle}</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">{t.home.dischargeText}</p>
            <Link href={href("/catalog/nabory-na-vypisku")} className="btn-primary mt-7 w-fit">
              {t.home.dischargeCta}
            </Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] lg:aspect-auto lg:min-h-[480px]">
          {product && (
            <Image src={imageUrl(product.images[0])} alt={product.name} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          )}
        </div>
      </div>
    </section>
  );
}

export function BrandQuote({ t }: { t: Dictionary }) {
  return (
    <section className="container-x mt-20 sm:mt-28">
      <div className="relative mx-auto max-w-3xl text-center">
        <Monogram size={140} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.12]" />
        <p className="eyebrow mb-4">Celine Baby</p>
        <h2 className="text-[28px] leading-tight font-semibold sm:text-[38px]">{t.home.quoteTitle}</h2>
        <p className="mt-5 text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">{t.home.quoteText}</p>
      </div>
    </section>
  );
}

export function Benefits({ t }: { t: Dictionary }) {
  const icons = [Leaf, ShieldCheck, Truck, Gift];
  return (
    <section className="container-x mt-20 sm:mt-28">
      <div className="grid gap-6 border-y border-line py-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:py-14">
        {t.home.benefits.map((b, i) => {
          const Icon = icons[i];
          return (
            <div key={b.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{b.title}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{b.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function GiftBanner({ t, href }: { t: Dictionary; href: H }) {
  return (
    <section className="container-x mt-20 sm:mt-28">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-rose-600 via-rose-600 to-rose-800 px-8 py-12 text-white sm:px-14 sm:py-16">
        <Monogram size={520} className="pointer-events-none absolute -right-24 -top-32 opacity-[0.18]" />
        <div className="relative max-w-lg">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">{t.home.giftEyebrow}</p>
          <h2 className="text-[30px] leading-tight font-semibold sm:text-[40px]">{t.home.giftTitle}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/90">{t.home.giftText}</p>
          <Link href={href("/gift-cards")} className="btn mt-7 bg-white text-rose-800 hover:bg-rose-50">
            {t.home.giftCta}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function BlogTeasers({ t, href, posts }: { t: Dictionary; href: H; posts: BlogPost[] }) {
  return (
    <section className="container-x mt-20 sm:mt-28">
      <SectionHeading title={t.home.blogTitle} subtitle={t.home.blogSubtitle} href={href("/blog")} linkLabel={t.home.seeAll} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.slice(0, 3).map((p) => (
          <Link key={p.slug} href={href(`/blog/${p.slug}`)} className="group">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand">
              <Image src={imageUrl(p.image)} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-105" />
            </div>
            <p className="mt-4 text-[12px] text-muted">
              {new Date(p.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })} · {p.readMinutes} {t.pages.blog.minutes}
            </p>
            <h3 className="mt-1.5 text-[17px] font-semibold leading-snug group-hover:text-rose-700">{p.title}</h3>
            <p className="mt-2 line-clamp-2 text-[14px] text-muted">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
