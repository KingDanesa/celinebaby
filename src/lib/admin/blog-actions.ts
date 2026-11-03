"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { audit } from "./audit";
import { blogEditable, deleteBlogRecord, getBlogRecord, saveBlogRecord, slugTaken } from "@/lib/blog";
import { slugify } from "@/lib/catalog";
import type { BlogRecord } from "@/lib/types";

export type BlogInput = Omit<BlogRecord, "updatedAt"> & { originalSlug?: string };
export type BlogSaveResult = { ok: true; slug: string } | { ok: false; error: string };

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

export async function saveBlogPostAction(payload: string): Promise<BlogSaveResult> {
  const me = await requireAdmin();
  if (!blogEditable()) return { ok: false, error: "На демо-версии блог не редактируется. Это работает на боевом сервере." };
  let input: BlogInput;
  try {
    input = JSON.parse(payload) as BlogInput;
  } catch {
    return { ok: false, error: "Некорректные данные формы" };
  }
  const title = clip(input.title, 200);
  const body = String(input.body ?? "").trim().slice(0, 100_000);
  if (title.length < 3) return { ok: false, error: "Укажите заголовок" };
  if (body.length < 20) return { ok: false, error: "Напишите текст статьи" };
  if (!input.image) return { ok: false, error: "Добавьте обложку" };

  const slug = slugify(clip(input.slug, 120) || title).slice(0, 100);
  if (!slug) return { ok: false, error: "Не получилось составить адрес статьи, измените заголовок" };
  if (await slugTaken(slug, input.originalSlug)) return { ok: false, error: `Адрес «${slug}» уже занят другой статьёй, поменяйте его` };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : new Date().toISOString().slice(0, 10);

  const record: BlogRecord = {
    slug,
    status: input.status === "draft" ? "draft" : "published",
    date,
    image: clip(input.image, 500),
    title,
    excerpt: clip(input.excerpt, 400),
    body,
    titleKk: clip(input.titleKk, 200) || undefined,
    excerptKk: clip(input.excerptKk, 400) || undefined,
    bodyKk: String(input.bodyKk ?? "").trim().slice(0, 100_000) || undefined,
  };
  const before = input.originalSlug ? await getBlogRecord(input.originalSlug) : null;
  await saveBlogRecord(record, input.originalSlug);
  const changes: string[] = [];
  if (before) {
    if (before.title !== record.title) changes.push(`Заголовок: ${before.title} → ${record.title}`);
    if (before.body !== record.body) changes.push("Текст изменён");
    if (before.image !== record.image) changes.push("Обложка заменена");
    if ((before.bodyKk ?? "") !== (record.bodyKk ?? "") || (before.titleKk ?? "") !== (record.titleKk ?? "")) changes.push("Казахский текст изменён");
    if (before.status !== record.status) changes.push(record.status === "draft" ? "Скрыта в черновики" : "Опубликована");
    if (before.slug !== record.slug) changes.push(`Адрес: ${before.slug} → ${record.slug}`);
  }
  if (!before || changes.length) {
    await audit(before ? "blog_updated" : "blog_created", { admin: me, target: slug, label: title, details: before ? changes : [record.status === "draft" ? "Черновик" : "Опубликована"] });
  }
  revalidatePath("/", "layout");
  return { ok: true, slug };
}

export async function deleteBlogPostAction(slug: string) {
  const me = await requireAdmin();
  if (!blogEditable()) return;
  const post = await getBlogRecord(slug);
  if (post) {
    await deleteBlogRecord(slug);
    await audit("blog_deleted", { admin: me, target: slug, label: post.title });
  }
  revalidatePath("/", "layout");
  redirect("/admin/blog");
}
