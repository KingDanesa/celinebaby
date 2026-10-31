import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Gift, Leaf, ShieldCheck, Truck } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { BlogPost } from "@/lib/types";
import { imageUrl, cn } from "@/lib/format";
import { homeTiles, STORE } from "@/data/categories";
import { Monogram } from "@/components/ui/Logo";
import { Reveal } from "@/components/ui/Reveal";
import { Parallax } from "@/components/ui/Parallax";

type H = (p: string) => string;

const toneBg: Record<string, string> = { pink: "bg-pink", blue: "bg-blue", cream: "bg-cream", mint: "bg-mint" };
const toneTint: Record<string, string> = { pink: "bg-pink-deep/35", blue: "bg-blue-deep/35", cream: "bg-cream/40", mint: "bg-mint/40" };

/** Four category tiles with the cover photos. */
export function CategoryTiles({ t, href, className }: { t: Dictionary; href: H; className?: string }) {
  return (
    <section className={cn("grid grid-cols-2 lg:grid-cols-4", className)}>
      {homeTiles.map((tile, i) => {
        const to = tile.categories.length === 1 ? `/catalog/${tile.categories[0]}` : `/catalog?category=${tile.categories.join(",")}`;
        return (
          <Reveal key={tile.key} delay={i * 90} variant="fade" className={cn("relative aspect-[4/5] overflow-hidden sm:aspect-square lg:aspect-[4/5] xl:aspect-square", toneBg[tile.tone])}>
            <Link href={href(to)} className="group absolute inset-0 block overflow-hidden">
              <Parallax strength={0.05}>
                <Image src={tile.image} alt="" fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover object-top" />
              </Parallax>
              <div className={cn("absolute inset-0 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-50", toneTint[tile.tone])} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-center text-white [text-shadow:0_2px_20px_rgba(43,14,20,0.45)] transition-transform duration-500 ease-soft group-hover:-translate-y-1 sm:p-7">
                <h3 className="display-caps text-[20px] leading-tight sm:text-[24px]">{t.home.tiles[tile.key]}</h3>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </section>
  );
}

/** "Наборы на выписку" photo tile + "Магазин в Астане" info tile. */
export function DischargeTile({ t, href }: { t: Dictionary; href: H }) {
  return (
    <Reveal variant="fade" className="relative aspect-[4/5] overflow-hidden bg-pink sm:aspect-[16/10] lg:aspect-auto lg:min-h-[520px]">
      <Link href={href("/catalog/nabory-na-vypisku")} className="group absolute inset-0 block overflow-hidden">
        <Parallax strength={0.06}>
          <Image src="/img/covers/vypiska.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
        </Parallax>
        <div className="absolute inset-0 bg-pink-deep/30 mix-blend-multiply transition-opacity duration-700 group-hover:opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white [text-shadow:0_2px_30px_rgba(43,14,20,0.45)]">
          <h2 className="display-caps max-w-md px-6 text-[34px] sm:text-[clamp(28px,4.2vw,52px)]">{t.home.dischargeTitle}</h2>
          <p className="mt-3 text-[15px] font-medium sm:text-[18px]">{t.home.dischargeSub}</p>
        </div>
      </Link>
    </Reveal>
  );
}

export function StoreTile({ t }: { t: Dictionary }) {
  return (
    <section className="flex flex-col items-center justify-center bg-blue px-6 py-16 text-center text-ink sm:py-20 lg:min-h-[520px]">
      <Reveal variant="up" className="flex flex-col items-center">
        <Monogram size={44} className="opacity-70" />
        <h2 className="display-caps mt-3 text-[28px] sm:text-[clamp(24px,3.2vw,40px)]">{t.home.storeTitle}</h2>
        <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.12em]">{t.home.storeAddress}</p>
        <p className="mt-1.5 text-[13px] uppercase tracking-[0.12em] text-ink-soft">{t.home.storeHours}</p>
        <a href={STORE.map} target="_blank" rel="noreferrer" className="btn-outline mt-7 px-6 py-2.5 text-[11px]">
          {t.home.storeCta} <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </Reveal>
    </section>
  );
}

export function Benefits({ t }: { t: Dictionary }) {
  const icons = [ShieldCheck, Truck, Leaf, Gift];
  return (
    <section className="container-x">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-line py-12 lg:grid-cols-4 lg:py-16">
        {t.home.benefits.map((b, i) => {
          const Icon = icons[i];
          return (
            <Reveal key={b.title} delay={i * 90}>
              <Icon className="mb-3 h-5 w-5 text-rose-600" />
              <p className="text-[12px] font-bold uppercase tracking-[0.12em]">{b.title}</p>
              <p className="mt-1 text-[13px] text-ink-soft">{b.text}</p>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/** Blog as a pastel band: cream background, sharp photo blocks, caps titles — same language as the tiles above. */
export function BlogTeasers({ t, href, posts }: { t: Dictionary; href: H; posts: BlogPost[] }) {
  return (
    <section className="bg-cream">
      <div className="container-x py-14 sm:py-20">
        <Reveal className="mb-8 flex items-end justify-between sm:mb-10">
          <div>
            <p className="eyebrow mb-2">{t.home.blogSubtitle}</p>
            <h2 className="display-caps text-[28px] sm:text-[36px]">{t.home.blogTitle}</h2>
          </div>
          <Link href={href("/blog")} className="link-underline text-[11px] font-semibold uppercase tracking-[0.14em]">
            {t.home.seeAll}
          </Link>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
          {posts.slice(0, 3).map((p, i) => (
            <Reveal key={p.slug} delay={i * 100}>
              <Link href={href(`/blog/${p.slug}`)} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-pink-soft sm:aspect-[4/5]">
                  <Image src={imageUrl(p.image)} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/5 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{p.readMinutes} {t.pages.blog.minutes}</p>
                    <h3 className="mt-2 text-[15px] font-semibold uppercase leading-snug tracking-[0.06em] [text-shadow:0_2px_16px_rgba(43,14,20,0.4)] sm:text-[16px]">{p.title}</h3>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
