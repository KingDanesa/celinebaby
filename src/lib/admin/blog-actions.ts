"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { blogEditable, deleteBlogRecord, getBlogRecord, saveBlogRecord, slugTaken } from "@/lib/blog";
import { slugify } from "@/lib/catalog";
import type { BlogRecord } from "@/lib/types";

export type BlogInput = Omit<BlogRecord, "updatedAt"> & { originalSlug?: string };
export type BlogSaveResult = { ok: true; slug: string } | { ok: false; error: string };

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

export async function saveBlogPostAction(payload: string): Promise<BlogSaveResult> {
  await requireAdmin();
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
  await saveBlogRecord(record, input.originalSlug);
  revalidatePath("/", "layout");
  return { ok: true, slug };
}

export async function deleteBlogPostAction(slug: string) {
  await requireAdmin();
  if (!blogEditable()) return;
  if (await getBlogRecord(slug)) await deleteBlogRecord(slug);
  revalidatePath("/", "layout");
  redirect("/admin/blog");
}
