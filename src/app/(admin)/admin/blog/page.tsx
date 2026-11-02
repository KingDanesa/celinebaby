import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { blogEditable, listBlogRecords } from "@/lib/blog";
import { Card, PageTitle } from "@/components/admin/ui";
import { imageUrl } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Блог" };

export default async function AdminBlogPage() {
  await requireAdmin();
  const posts = await listBlogRecords();
  const editable = blogEditable();
  return (
    <>
      <PageTitle
        title="Блог"
        subtitle={`${posts.filter((p) => p.status === "published").length} опубликовано · ${posts.filter((p) => p.status === "draft").length} в черновиках`}
        action={
          editable ? (
            <Link href="/admin/blog/new" className="btn-primary">
              <Plus className="h-4 w-4" /> Новая статья
            </Link>
          ) : null
        }
      />
      {!editable && (
        <Card className="mb-6">
          <p className="text-[14px] text-ink-soft">На демо-версии статьи только для просмотра. Писать и редактировать статьи можно на боевом сервере.</p>
        </Card>
      )}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <ul className="divide-y divide-line">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={editable ? `/admin/blog/${p.slug}` : `/ru/blog/${p.slug}`} className="flex items-center gap-4 px-4 py-3 hover:bg-sand/60">
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-sand">
                  {p.image && <Image src={imageUrl(p.image)} alt="" fill sizes="80px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[14px] font-semibold">{p.title}</p>
                  <p className="text-[12px] text-muted">
                    {new Date(p.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                    {p.titleKk ? " · есть казахский" : ""}
                  </p>
                </div>
                <span className={p.status === "draft" ? "rounded-full bg-cream px-2.5 py-1 text-[12px] text-ink-soft" : "rounded-full bg-mint px-2.5 py-1 text-[12px] text-ink"}>
                  {p.status === "draft" ? "Черновик" : "На сайте"}
                </span>
              </Link>
            </li>
          ))}
          {posts.length === 0 && <li className="px-4 py-12 text-center text-muted">Статей пока нет</li>}
        </ul>
      </div>
    </>
  );
}
