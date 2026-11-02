import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageContext } from "@/lib/page";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { findPost, loadPosts } from "@/lib/blog";
import { imageUrl } from "@/lib/format";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = await findPost(decodeURIComponent(slug), locale);
  return post ? { title: post.title, description: post.excerpt, openGraph: { images: [post.image] } } : { title: "Blog" };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const { t, href, locale } = await pageContext(params);
  const post = await findPost(decodeURIComponent(slug), locale);
  if (!post) notFound();
  const others = (await loadPosts(locale)).filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <article className="container-x pt-5 sm:pt-8">
      <Breadcrumbs items={[{ label: t.catalog.breadcrumbHome, href: href("/") }, { label: t.pages.blog.title, href: href("/blog") }, { label: post.title }]} />
      <header className="mx-auto mt-8 max-w-3xl text-center">
        <p className="text-[12px] text-muted">
          {new Date(post.date).toLocaleDateString(locale === "kk" ? "kk-KZ" : "ru-RU", { day: "numeric", month: "long", year: "numeric" })} · {post.readMinutes} {t.pages.blog.minutes}
        </p>
        <h1 className="mt-3 text-[30px] leading-tight font-semibold sm:text-[42px]">{post.title}</h1>
        <p className="mt-4 text-[16px] text-ink-soft">{post.excerpt}</p>
      </header>
      <div className="relative mx-auto mt-10 aspect-[16/9] max-w-5xl overflow-hidden rounded-[28px] bg-sand">
        <Image src={imageUrl(post.image)} alt="" fill priority sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" />
      </div>
      <div className="prose-soft mx-auto mt-12 max-w-2xl text-[16px]" dangerouslySetInnerHTML={{ __html: post.html }} />
      <div className="mx-auto mt-12 max-w-2xl border-t border-line pt-6">
        <Link href={href("/blog")} className="text-[13px] font-semibold uppercase tracking-wider text-rose-700">
          ← {t.pages.blog.back}
        </Link>
      </div>
      <section className="mt-20">
        <div className="grid gap-8 sm:grid-cols-3">
          {others.map((p) => (
            <Link key={p.slug} href={href(`/blog/${p.slug}`)} className="group">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand">
                <Image src={imageUrl(p.image)} alt="" fill sizes="33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <h3 className="mt-3 text-[16px] font-semibold leading-snug group-hover:text-rose-700">{p.title}</h3>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
