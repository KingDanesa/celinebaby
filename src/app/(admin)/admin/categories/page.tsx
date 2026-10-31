import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/admin/auth";
import { loadAllProducts } from "@/lib/products";
import { categories } from "@/data/categories";
import { Card, PageTitle } from "@/components/admin/ui";
import { imageUrl } from "@/lib/format";
import ru from "@/i18n/ru";
import kk from "@/i18n/kk";

export default async function CategoriesPage() {
  await requireAdmin();
  const products = await loadAllProducts();
  const count = (f: (p: (typeof products)[number]) => boolean) => products.filter(f).length;

  return (
    <>
      <PageTitle title="Категории" subtitle="Каталог устроен по трём осям. Товар получает по одному значению на каждой оси и автоматически попадает во все нужные разделы." />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card title="Категории товаров">
            <ul className="divide-y divide-line">
              {[...categories]
                .sort((a, b) => a.order - b.order)
                .map((c) => {
                  const list = products.filter((p) => p.category === c.slug);
                  const cover = list.find((p) => p.images.length)?.images[0];
                  return (
                    <li key={c.slug} className="flex items-center gap-4 py-3">
                      <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-sand">
                        {cover && <Image src={imageUrl(cover)} alt="" fill sizes="40px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium">{ru.categories[c.slug]}</p>
                        <p className="text-[12px] text-muted">
                          {kk.categories[c.slug]} · /catalog/{c.slug}
                        </p>
                      </div>
                      <Link href={`/admin/products?category=${c.slug}`} className="text-[13px] text-ink-soft hover:text-rose-700">
                        {list.length} шт.
                      </Link>
                    </li>
                  );
                })}
            </ul>
            <p className="mt-4 text-[12px] text-muted">Список категорий и их переводы задаются в коде (src/data/categories.ts и словари). Чтобы добавить категорию, напишите разработчику.</p>
          </Card>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card title="Для кого">
            <Axis rows={[["Девочкам", count((p) => p.gender === "girl")], ["Мальчикам", count((p) => p.gender === "boy")], ["Универсальное", count((p) => p.gender === "unisex")]]} />
            <p className="mt-3 text-[12px] text-muted">Универсальные товары показываются и девочкам, и мальчикам.</p>
          </Card>
          <Card title="Возраст">
            <Axis rows={[["Малыши 0–18 мес", count((p) => p.ages.includes("newborn"))], ["Дети 1,5–4 года", count((p) => p.ages.includes("toddler"))]]} />
          </Card>
          <Card title="Метки">
            <Axis rows={[["Новинка", count((p) => p.tags.includes("new"))], ["Хит продаж", count((p) => p.tags.includes("hit"))], ["Скидка", count((p) => p.tags.includes("sale"))]]} />
            <p className="mt-3 text-[12px] text-muted">Хиты выводятся на главной, новинки — в разделе «Новинки» и на главной.</p>
          </Card>
        </div>
      </div>
    </>
  );
}

function Axis({ rows }: { rows: [string, number][] }) {
  return (
    <ul className="divide-y divide-line text-[14px]">
      {rows.map(([k, v]) => (
        <li key={k} className="flex justify-between py-2">
          <span>{k}</span>
          <span className="tabular-nums text-muted">{v}</span>
        </li>
      ))}
    </ul>
  );
}
