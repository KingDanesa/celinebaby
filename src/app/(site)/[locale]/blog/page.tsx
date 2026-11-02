import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { pageContext } from "@/lib/page";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadPosts } from "@/lib/blog";
import { imageUrl } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { t } = await pageContext(params);
  return { title: t.pages.blog.title };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t, href, locale } = await pageContext(params);
  const b = t.pages.blog;
  const [first, ...rest] = await loadPosts(locale);
  return (
    <>
      <PageHeader title={b.title} lead={b.lead} crumbs={[{ label: t.catalog.breadcrumbHome, href: href("/") }, { label: b.title }]} />
      {first && (
      <div className="container-x mt-10">
        <Link href={href(`/blog/${first.slug}`)} className="group grid gap-6 overflow-hidden rounded-[28px] bg-sand lg:grid-cols-2">
          <div className="relative aspect-[16/10] lg:aspect-auto">
            <Image src={imageUrl(first.image)} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          </div>
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <p className="text-[12px] text-muted">
              {new Date(first.date).toLocaleDateString(locale === "kk" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric" })} · {first.readMinutes} {b.minutes}
            </p>
            <h2 className="mt-3 text-[26px] leading-tight font-semibold group-hover:text-rose-700 sm:text-[32px]">{first.title}</h2>
            <p className="mt-4 text-[15px] text-ink-soft">{first.excerpt}</p>
            <span className="mt-6 text-[13px] font-semibold uppercase tracking-wider text-rose-700">{b.readMore} →</span>
          </div>
        </Link>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link key={p.slug} href={href(`/blog/${p.slug}`)} className="group">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand">
                <Image src={imageUrl(p.image)} alt="" fill sizes="33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <p className="mt-4 text-[12px] text-muted">
                {new Date(p.date).toLocaleDateString(locale === "kk" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric" })} · {p.readMinutes} {b.minutes}
              </p>
              <h3 className="mt-1.5 text-[18px] font-semibold leading-snug group-hover:text-rose-700">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-[14px] text-muted">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
      )}
    </>
  );
}
