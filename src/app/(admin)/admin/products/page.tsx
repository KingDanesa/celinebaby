import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { loadAllProducts } from "@/lib/products";
import { Badge, PageTitle } from "@/components/admin/ui";
import { formatPrice, imageUrl, cn } from "@/lib/format";
import { categories } from "@/data/categories";
import ru from "@/i18n/ru";

const PER_PAGE = 30;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const cat = sp.category ?? "";
  const status = sp.status ?? "";
  const photo = sp.photo ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  let list = await loadAllProducts();
  if (q) list = list.filter((p) => `${p.name} ${p.sku} ${p.id}`.toLowerCase().includes(q));
  if (cat) list = list.filter((p) => p.category === cat);
  if (status === "draft") list = list.filter((p) => p.status === "draft");
  if (status === "active") list = list.filter((p) => p.status !== "draft");
  if (photo === "none") list = list.filter((p) => p.images.length === 0);
  list = [...list].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "") || b.id - a.id);

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const items = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const link = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", sp.q!);
    if (cat) p.set("category", cat);
    if (status) p.set("status", status);
    if (photo) p.set("photo", photo);
    if (n > 1) p.set("page", String(n));
    return `/admin/products${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageTitle
        title="Товары"
        subtitle={`${list.length} шт.`}
        action={
          <Link href="/admin/products/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Добавить товар
          </Link>
        }
      />

      <form className="mb-5 flex flex-wrap items-center gap-2" method="get">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Название, артикул или ID" className="input h-10 pl-10" />
        </label>
        <select name="category" defaultValue={cat} className="input h-10 w-auto">
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {ru.categories[c.slug]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="input h-10 w-auto">
          <option value="">Любой статус</option>
          <option value="active">На сайте</option>
          <option value="draft">Черновики</option>
        </select>
        <button type="submit" className="btn-dark h-10 px-5">
          Найти
        </button>
        {(q || cat || status || photo) && (
          <Link href="/admin/products" className="text-[13px] text-muted hover:text-ink">
            Сбросить
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-[14px]">
          <thead className="bg-sand text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Товар</th>
              <th className="hidden px-4 py-3 md:table-cell">Категория</th>
              <th className="hidden px-4 py-3 lg:table-cell">Для кого / возраст</th>
              <th className="px-4 py-3 text-right">Цена</th>
              <th className="hidden px-4 py-3 sm:table-cell">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-rose-50/40">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-sand">
                      {p.images[0] && <Image src={imageUrl(p.images[0])} alt="" fill sizes="44px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-medium leading-snug">{p.name}</p>
                      <p className="text-[12px] text-muted">
                        #{p.id} {p.sku && `· ${p.sku}`} · {p.sizes.length ? p.sizes.join(", ") : "без размеров"}
                      </p>
                    </div>
                  </Link>
                </td>
                <td className="hidden px-4 py-2.5 text-ink-soft md:table-cell">{ru.categories[p.category]}</td>
                <td className="hidden px-4 py-2.5 text-ink-soft lg:table-cell">
                  {{ girl: "Девочкам", boy: "Мальчикам", unisex: "Универсальное" }[p.gender]}
                  <span className="text-muted"> · {p.ages.map((a) => (a === "newborn" ? "Малыши 0–18" : "Дети 1,5–4")).join(", ")}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums">{formatPrice(p.price)}</td>
                <td className="hidden px-4 py-2.5 sm:table-cell">
                  <Badge status={p.status ?? "active"} />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2 text-[14px]">
          <Link href={link(page - 1)} className={cn("rounded-full p-2 hover:bg-white", page <= 1 && "pointer-events-none opacity-30")}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-muted">
            {page} / {pages}
          </span>
          <Link href={link(page + 1)} className={cn("rounded-full p-2 hover:bg-white", page >= pages && "pointer-events-none opacity-30")}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}
