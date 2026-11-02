import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { loadProducts } from "@/lib/products";
import { categories, presetRoutes } from "@/data/categories";
import { loadPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";


/** Every public page in Russian with its Kazakh alternate. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entry = (path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl()}/ru${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    changeFrequency: path.startsWith("/product/") ? "weekly" : "daily",
    priority,
    alternates: { languages: { ru: `${siteUrl()}/ru${path}`, kk: `${siteUrl()}/kk${path}` } },
  });

  const pages = ["", "/catalog", "/about", "/contacts", "/delivery", "/sizes", "/gift-cards", "/blog", "/offer", "/privacy"].map((p) =>
    entry(p, p === "" ? 1 : 0.5),
  );
  const presets = Object.keys(presetRoutes).map((s) => entry(`/catalog/${s}`, 0.8));
  const cats = categories.map((c) => entry(`/catalog/${c.slug}`, 0.8));
  const posts = (await loadPosts("ru")).map((p) => entry(`/blog/${p.slug}`, 0.4));
  const products = (await loadProducts()).map((p) => entry(`/product/${p.slug}`, 0.7, p.updatedAt ?? p.createdAt));
  return [...pages, ...presets, ...cats, ...posts, ...products];
}
