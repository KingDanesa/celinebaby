import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { blogEditable, getBlogRecord } from "@/lib/blog";
import { siteUrl } from "@/lib/site";
import { PageTitle } from "@/components/admin/ui";
import { BlogForm } from "@/components/admin/BlogForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Статья" };

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  if (!blogEditable()) notFound();
  const post = await getBlogRecord(decodeURIComponent(slug));
  if (!post) notFound();
  return (
    <>
      <Link href="/admin/blog" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Все статьи
      </Link>
      <PageTitle title={post.title} subtitle={post.status === "draft" ? "Черновик" : "Опубликована"} />
      <BlogForm key={post.slug} post={post} siteUrl={siteUrl()} />
    </>
  );
}
