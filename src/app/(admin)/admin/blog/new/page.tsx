import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { blogEditable } from "@/lib/blog";
import { siteUrl } from "@/lib/site";
import { PageTitle } from "@/components/admin/ui";
import { BlogForm } from "@/components/admin/BlogForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Новая статья" };

export default async function NewPostPage() {
  await requireAdmin();
  if (!blogEditable()) notFound();
  return (
    <>
      <Link href="/admin/blog" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Все статьи
      </Link>
      <PageTitle title="Новая статья" />
      <BlogForm post={null} siteUrl={siteUrl()} />
    </>
  );
}
