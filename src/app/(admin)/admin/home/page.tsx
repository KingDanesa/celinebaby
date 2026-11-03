import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { defaultHome, getHome, getHomeOverrides } from "@/lib/home";
import { dbEnabled } from "@/lib/db";
import { getDictionary } from "@/i18n";
import { categories } from "@/data/categories";
import { Card, PageTitle } from "@/components/admin/ui";
import { HomeEditor } from "@/components/admin/HomeEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Главная страница" };

export default async function HomeAdminPage() {
  await requireAdmin();
  const ru = getDictionary("ru");
  const [home, overrides] = await Promise.all([getHome(), getHomeOverrides()]);
  // Suggestions for "Куда ведёт нажатие": sections and every category of the catalog.
  const links = [
    { value: "/catalog", label: "Весь каталог" },
    { value: "/catalog/newborn", label: "Малыши (0–18 мес)" },
    { value: "/catalog/toddler", label: "Дети (1,5–4 года)" },
    { value: "/catalog/new", label: "Новинки" },
    { value: "/catalog/sale", label: "Распродажа" },
    { value: "/catalog/hits", label: "Хиты" },
    { value: "/catalog/girls", label: "Девочкам" },
    { value: "/catalog/boys", label: "Мальчикам" },
    ...categories.map((c) => ({ value: `/catalog/${c.slug}`, label: (ru.categories as Record<string, string>)[c.slug] ?? c.slug })),
    { value: "/catalog?category=shapki-i-snudy,aksessuary", label: "Шапки и аксессуары" },
  ];
  return (
    <>
      <PageTitle title="Главная страница" subtitle="Надписи, фото и видео блоков на главной. Расположение блоков не меняется — меняется их содержимое." />
      {!dbEnabled() && (
        <Card className="mb-6">
          <p className="text-[14px] text-ink-soft">Главная меняется на боевом сервере.</p>
        </Card>
      )}
      <HomeEditor home={home} defaults={defaultHome()} overrides={overrides} links={links} />
    </>
  );
}
