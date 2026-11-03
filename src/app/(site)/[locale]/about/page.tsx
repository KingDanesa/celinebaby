import Image from "next/image";
import type { Metadata } from "next";
import { pageContext } from "@/lib/page";
import { PageHeader } from "@/components/ui/PageHeader";
import { Benefits } from "@/components/home/Sections";
import { Monogram } from "@/components/ui/Logo";
import { getHome } from "@/lib/home";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.pages.about.title };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href, locale } = await pageContext(params);
  const a = t.pages.about;
  // Photos of the shop in Astana: the hall, the entrance (raised in the middle) and the house-shaped shelves.
  const gallery = ["/img/about-1.jpg", "/img/about-2.jpg", "/img/about-3.jpg"];

  return (
    <>
      <PageHeader eyebrow={a.eyebrow} title={a.title} lead={a.lead} crumbs={[{ label: t.catalog.breadcrumbHome, href: href("/") }, { label: a.title }]} />

      <div className="container-x mt-12 grid gap-4 sm:grid-cols-3">
        {gallery.map((src, i) => (
          <div key={src} className={`relative aspect-[3/4] overflow-hidden rounded-3xl bg-sand ${i === 1 ? "sm:-mt-8" : ""}`}>
            <Image src={src} alt={`${a.visit}, Celine Baby`} fill priority={i === 0} sizes="(max-width: 640px) 100vw, 33vw" className="object-cover object-[center_40%]" />
          </div>
        ))}
      </div>

      <div className="container-x mt-16 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Monogram size={160} className="opacity-30" />
        </div>
        <div className="flex flex-col gap-10 lg:col-span-8">
          {a.blocks.map((b, i) => (
            <div key={b.title} className="grid gap-3 border-t border-line pt-8 sm:grid-cols-12">
              <span className="font-display text-[13px] text-rose-600 sm:col-span-2">0{i + 1}</span>
              <div className="sm:col-span-10">
                <h2 className="text-[22px] font-semibold">{b.title}</h2>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Benefits home={await getHome()} locale={locale} />

      <section className="container-x mt-20">
        <div className="relative overflow-hidden rounded-[32px] bg-rose-50 px-8 py-12 sm:px-14 sm:py-16">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <Image src="/brand/pattern-balloons.jpg" alt="" fill sizes="100vw" className="object-cover" />
          </div>
          <div className="relative max-w-lg">
            <h2 className="text-[28px] font-semibold sm:text-[36px]">{a.visit}</h2>
            <p className="mt-3 text-[15px] text-ink-soft">{a.visitText}</p>
          </div>
        </div>
      </section>
    </>
  );
}
