"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Check, Trash2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { categories } from "@/data/categories";
import ru from "@/i18n/ru";
import { cn } from "@/lib/format";
import { deleteProductAction, saveProductAction, type ProductInput } from "@/lib/admin/actions";
import { ImageUploader } from "./ImageUploader";
import { SIZE_ORDER } from "@/lib/catalog";

const PALETTE: { name: string; hex: string }[] = [
  { name: "Белый", hex: "#FFFFFF" }, { name: "Молочный", hex: "#F8F3EA" }, { name: "Экрю", hex: "#F1E8DA" }, { name: "Кремовый", hex: "#F7EFE2" },
  { name: "Бежевый", hex: "#D8C2A8" }, { name: "Капучино", hex: "#C8A88B" }, { name: "Топлёное молоко", hex: "#EEDDC5" }, { name: "Песочный", hex: "#E3CFA9" },
  { name: "Розовый", hex: "#F2B8C6" }, { name: "Пудровый", hex: "#EAC9C9" }, { name: "Сухая роза", hex: "#C98E95" }, { name: "Персиковый", hex: "#F7C9A9" },
  { name: "Голубой", hex: "#A9CBE8" }, { name: "Небесный", hex: "#BBD9F0" }, { name: "Синий", hex: "#3C5A98" }, { name: "Тёмно-синий", hex: "#27375E" },
  { name: "Мятный", hex: "#BFE3D3" }, { name: "Зелёный", hex: "#8FB094" }, { name: "Серо-зелёный", hex: "#A5B6A1" }, { name: "Оливковый", hex: "#8A8F5A" },
  { name: "Лиловый", hex: "#C8A2C8" }, { name: "Лавандовый", hex: "#C9B6E4" }, { name: "Жёлтый", hex: "#F5D76E" }, { name: "Горчичный", hex: "#D4A72C" },
  { name: "Серый", hex: "#B4B2B0" }, { name: "Светло-серый", hex: "#DADAD8" }, { name: "Графит", hex: "#5B5B5E" }, { name: "Чёрный", hex: "#222222" },
  { name: "Коричневый", hex: "#7B5A3C" }, { name: "Шоколад", hex: "#5A3A2A" }, { name: "Красный", hex: "#C94A4A" }, { name: "Бургунди", hex: "#7A2E3B" },
];

const SIZE_GROUPS: { title: string; sizes: string[] }[] = [
  { title: "По возрасту", sizes: ["0-1 мес", "0-3 мес", "1-3 мес", "3-6 мес", "6-9 мес", "9-12 мес", "12-18 мес", "18-24 мес", "24-36 мес", "2-3 года", "3-4 года"] },
  { title: "По росту (см)", sizes: ["56", "62", "68", "74", "80", "86", "92", "98", "104"] },
  { title: "Головные уборы", sizes: ["40/42", "42/44", "44/46", "46/48", "48/50"] },
];

function htmlToText(html: string): string {
  return html
    .replace(/<\/p>\s*<p>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<li>/g, "• ")
    .replace(/<\/li>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function initial(p: Product | null): ProductInput {
  return {
    id: p?.id,
    name: p?.name ?? "",
    nameKk: p?.nameKk ?? "",
    sku: p?.sku ?? "",
    price: p?.price ?? 0,
    oldPrice: p?.oldPrice ?? null,
    category: p?.category ?? "",
    gender: p?.gender ?? "unisex",
    ages: p?.ages ?? ["newborn"],
    brand: p?.brand ?? "",
    sizes: p?.sizes ?? [],
    colors: p?.colors ?? [],
    images: p?.images ?? [],
    descriptionText: p ? htmlToText(p.description) : "",
    composition: p?.composition ?? "",
    care: p?.care ?? "",
    lining: p?.lining ?? "",
    tags: p?.tags ?? [],
    inStock: p?.inStock ?? true,
    status: p?.status ?? "active",
  };
}

export function ProductForm({ product }: { product: Product | null }) {
  const router = useRouter();
  const [f, setF] = useState<ProductInput>(() => initial(product));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [customSize, setCustomSize] = useState("");
  const [customColor, setCustomColor] = useState({ name: "", hex: "#E5DDD8" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const submit = (status: "active" | "draft") => {
    setError(null);
    start(async () => {
      const res = await saveProductAction(JSON.stringify({ ...f, status }));
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setSaved(true);
      if (!f.id) router.replace(`/admin/products/${res.id}`);
      else {
        setF((prev) => ({ ...prev, status }));
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  const sortedSizes = [...f.sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(f.status);
      }}
      className="grid gap-6 lg:grid-cols-12"
    >
      <div className="flex flex-col gap-6 lg:col-span-8">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-[14px] text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <Section title="Основное">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Название" required className="sm:col-span-2">
              <input value={f.name} onChange={(e) => set("name", e.target.value)} className="input" placeholder="Например: Боди с длинным рукавом Молочный" />
            </Field>
            <Field label="Название на казахском" hint="Необязательно, если пусто — покажем русское">
              <input value={f.nameKk} onChange={(e) => set("nameKk", e.target.value)} className="input" />
            </Field>
            <Field label="Артикул">
              <input value={f.sku} onChange={(e) => set("sku", e.target.value)} className="input" />
            </Field>
            <Field label="Цена, ₸" required>
              <input inputMode="numeric" value={f.price || ""} onChange={(e) => set("price", Number(e.target.value.replace(/\D/g, "")))} className="input" />
            </Field>
            <Field label="Старая цена, ₸" hint="Для скидки: будет показана зачёркнутой">
              <input inputMode="numeric" value={f.oldPrice || ""} onChange={(e) => set("oldPrice", Number(e.target.value.replace(/\D/g, "")) || null)} className="input" />
            </Field>
            <Field label="Бренд">
              <input value={f.brand} onChange={(e) => set("brand", e.target.value)} className="input" placeholder="Leoking, НВ, US Polo…" list="brands" />
              <datalist id="brands">
                {["Leoking", "НВ", "US Polo", "Bugatti", "Escada"].map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </Field>
          </div>
        </Section>

        <Section title="Где показывать" hint="Три поля ниже определяют, в какие разделы и фильтры попадёт товар.">
          <div className="grid gap-5">
            <Field label="Категория" required>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((c) => (
                  <Chip key={c.slug} on={f.category === c.slug} onClick={() => set("category", c.slug)}>
                    {ru.categories[c.slug]}
                  </Chip>
                ))}
              </div>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Для кого" required>
                <div className="flex flex-wrap gap-2">
                  {([["girl", "Девочкам"], ["boy", "Мальчикам"], ["unisex", "Универсальное"]] as const).map(([v, l]) => (
                    <Chip key={v} on={f.gender === v} onClick={() => set("gender", v)}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Возраст" required hint="Можно отметить оба">
                <div className="flex flex-wrap gap-2">
                  {([["newborn", "Новорождённым 0–18 мес"], ["toddler", "Малышам 1,5–4 года"]] as const).map(([v, l]) => (
                    <Chip key={v} on={f.ages.includes(v)} onClick={() => set("ages", toggle(f.ages, v))}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Метки">
              <div className="flex flex-wrap gap-2">
                {([["new", "Новинка"], ["hit", "Хит продаж"], ["sale", "Скидка"]] as const).map(([v, l]) => (
                  <Chip key={v} on={f.tags.includes(v)} onClick={() => set("tags", toggle(f.tags, v))}>
                    {l}
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        <Section title="Фотографии" hint="Первое фото — главное. Перетаскивать не нужно: используйте стрелки. Фото автоматически уменьшаются перед загрузкой.">
          <ImageUploader images={f.images} onChange={(images) => set("images", images)} />
        </Section>

        <Section title="Размеры">
          {SIZE_GROUPS.map((g) => (
            <div key={g.title} className="mb-3">
              <p className="mb-1.5 text-[12px] text-muted">{g.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.sizes.map((s) => (
                  <Chip key={s} small on={f.sizes.includes(s)} onClick={() => set("sizes", toggle(f.sizes, s))}>
                    {s}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (customSize.trim()) set("sizes", toggle(f.sizes, customSize.trim()));
                  setCustomSize("");
                }
              }}
              placeholder="Свой размер, например 100×100 см"
              className="input h-10 w-64"
            />
            <button
              type="button"
              className="btn-outline h-10 px-4 text-[13px]"
              onClick={() => {
                if (customSize.trim()) set("sizes", toggle(f.sizes, customSize.trim()));
                setCustomSize("");
              }}
            >
              Добавить
            </button>
          </div>
          {sortedSizes.length > 0 && (
            <p className="mt-3 text-[13px] text-ink-soft">
              Выбрано: <span className="font-medium">{sortedSizes.join(", ")}</span>
            </p>
          )}
        </Section>

        <Section title="Цвета">
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => {
              const on = f.colors.some((x) => x.name === c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => set("colors", on ? f.colors.filter((x) => x.name !== c.name) : [...f.colors, c])}
                  className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[12px] transition", on ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink")}
                >
                  <span className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
                  {c.name}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input type="color" value={customColor.hex} onChange={(e) => setCustomColor({ ...customColor, hex: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-white p-1" />
            <input value={customColor.name} onChange={(e) => setCustomColor({ ...customColor, name: e.target.value })} placeholder="Свой цвет: название" className="input h-10 w-56" />
            <button
              type="button"
              className="btn-outline h-10 px-4 text-[13px]"
              onClick={() => {
                if (!customColor.name.trim()) return;
                set("colors", [...f.colors.filter((x) => x.name !== customColor.name.trim()), { name: customColor.name.trim(), hex: customColor.hex }]);
                setCustomColor({ name: "", hex: "#E5DDD8" });
              }}
            >
              Добавить
            </button>
          </div>
          {f.colors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {f.colors.map((c) => (
                <span key={c.name} className="flex items-center gap-1.5 rounded-full bg-sand py-1 pl-1 pr-2 text-[12px]">
                  <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} /> {c.name}
                  <button type="button" aria-label="Убрать" onClick={() => set("colors", f.colors.filter((x) => x.name !== c.name))} className="ml-1 text-muted hover:text-rose-700">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </Section>

        <Section title="Описание">
          <div className="grid gap-4">
            <Field label="Текст описания" hint="Пустая строка между абзацами = новый абзац">
              <textarea value={f.descriptionText} onChange={(e) => set("descriptionText", e.target.value)} rows={8} className="input resize-y leading-relaxed" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Состав">
                <input value={f.composition} onChange={(e) => set("composition", e.target.value)} className="input" placeholder="100% хлопок" />
              </Field>
              <Field label="Уход">
                <input value={f.care} onChange={(e) => set("care", e.target.value)} className="input" placeholder="Стирка при 30 °C" />
              </Field>
              <Field label="Подклад">
                <input value={f.lining} onChange={(e) => set("lining", e.target.value)} className="input" />
              </Field>
            </div>
          </div>
        </Section>
      </div>

      <aside className="lg:col-span-4">
        <div className="sticky top-6 flex flex-col gap-4">
          <Section title="Публикация">
            <label className="flex items-center justify-between gap-3 py-1 text-[14px]">
              <span>В наличии</span>
              <input type="checkbox" checked={f.inStock} onChange={(e) => set("inStock", e.target.checked)} className="h-5 w-5 accent-rose-600" />
            </label>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" disabled={pending} onClick={() => submit("active")} className="btn-primary w-full">
                {saved ? <Check className="h-4 w-4" /> : null}
                {pending ? "Сохраняем…" : saved ? "Сохранено" : "Сохранить и показать на сайте"}
              </button>
              <button type="button" disabled={pending} onClick={() => submit("draft")} className="btn-outline w-full">
                Сохранить как черновик
              </button>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              {f.status === "draft" ? "Сейчас товар скрыт с сайта (черновик)." : f.id ? "Сейчас товар показывается на сайте." : "Черновики не видны покупателям."}
            </p>
          </Section>

          {f.id && (
            <Section title="Удаление">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-[14px] text-rose-700 hover:text-rose-900">
                  <Trash2 className="h-4 w-4" /> Удалить товар
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-ink-soft">Точно удалить? Это действие нельзя отменить.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => start(() => deleteProductAction(f.id!))} className="btn-dark h-9 px-4 text-[13px]">
                      Да, удалить
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="btn-outline h-9 px-4 text-[13px]">
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      </aside>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, className, children }: { label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft">
        {label} {required && <span className="text-rose-600">*</span>}
      </span>
      {children}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

function Chip({ on, onClick, children, small }: { on: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-full border text-left transition",
        small ? "px-3 py-1 text-[12px]" : "px-3.5 py-2 text-[13px]",
        on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}
