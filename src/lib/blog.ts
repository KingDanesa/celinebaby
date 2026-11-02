import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { blogPosts as seedPosts } from "@/data/blog";
import { db } from "@/lib/db";
import { htmlToMarkup, markupToHtml, readingMinutes } from "@/lib/blog-format";
import type { BlogPost, BlogRecord } from "@/lib/types";

/**
 * Blog articles. With DATABASE_URL (production) they live in the blog_posts table and are edited in the admin;
 * the first four articles are copied in once. Without a database (demo) the articles from src/data/blog.ts are shown.
 */

export const BLOG_TAG = "blog";
export const blogEditable = () => !!process.env.DATABASE_URL;

const seedRecords = (): BlogRecord[] =>
  seedPosts.map((p) => ({
    slug: p.slug,
    status: "published",
    date: p.date,
    image: p.image,
    title: p.title,
    excerpt: p.excerpt,
    body: htmlToMarkup(p.html),
  }));

async function seedOnce() {
  const [done] = await db()`select 1 from app_meta where key = 'blog_seeded'`;
  if (done) return;
  await db().begin(async (sql) => {
    for (const r of seedRecords()) {
      await sql`insert into blog_posts (slug, status, date, data) values (${r.slug}, ${r.status}, ${r.date}, ${sql.json(r as never)}) on conflict (slug) do nothing`;
    }
    await sql`insert into app_meta (key, value) values ('blog_seeded', ${new Date().toISOString()}) on conflict do nothing`;
  });
}

const loadAll = unstable_cache(
  async (): Promise<BlogRecord[]> => {
    if (!blogEditable()) return seedRecords();
    await seedOnce();
    const rows = await db()`select data from blog_posts order by date desc, updated_at desc`;
    return rows.map((r) => r.data as BlogRecord);
  },
  ["blog-all-v1"],
  { tags: [BLOG_TAG], revalidate: 300 },
);

export function invalidateBlog() {
  revalidateTag(BLOG_TAG, { expire: 0 });
}

/** All articles for the admin, drafts included. */
export async function listBlogRecords(): Promise<BlogRecord[]> {
  return loadAll();
}

export async function getBlogRecord(slug: string): Promise<BlogRecord | null> {
  return (await loadAll()).find((r) => r.slug === slug) ?? null;
}

/** Article in the visitor's language; Kazakh falls back to Russian field by field. */
export function localize(r: BlogRecord, locale: string): BlogPost {
  const kk = locale === "kk";
  const body = (kk && r.bodyKk?.trim()) || r.body;
  return {
    slug: r.slug,
    title: (kk && r.titleKk?.trim()) || r.title,
    excerpt: (kk && r.excerptKk?.trim()) || r.excerpt,
    date: r.date,
    image: r.image,
    readMinutes: readingMinutes(body),
    html: markupToHtml(body),
  };
}

/** Published articles for the site, newest first. */
export async function loadPosts(locale: string): Promise<BlogPost[]> {
  return (await loadAll()).filter((r) => r.status === "published").map((r) => localize(r, locale));
}

export async function findPost(slug: string, locale: string): Promise<BlogPost | null> {
  const r = await getBlogRecord(slug);
  return r && r.status === "published" ? localize(r, locale) : null;
}

export async function saveBlogRecord(r: BlogRecord, previousSlug?: string) {
  const row = { ...r, updatedAt: new Date().toISOString() };
  await db().begin(async (sql) => {
    if (previousSlug && previousSlug !== r.slug) await sql`delete from blog_posts where slug = ${previousSlug}`;
    await sql`
      insert into blog_posts (slug, status, date, data, updated_at)
      values (${r.slug}, ${r.status}, ${r.date}, ${sql.json(row as never)}, now())
      on conflict (slug) do update set status = excluded.status, date = excluded.date, data = excluded.data, updated_at = now()`;
  });
  invalidateBlog();
}

export async function deleteBlogRecord(slug: string) {
  await db()`delete from blog_posts where slug = ${slug}`;
  invalidateBlog();
}

export async function slugTaken(slug: string, except?: string): Promise<boolean> {
  const [row] = await db()`select 1 from blog_posts where slug = ${slug} and slug <> ${except ?? ""}`;
  return !!row;
}
