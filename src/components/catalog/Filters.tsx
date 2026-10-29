"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { Facets, CatalogQuery } from "@/lib/catalog";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn, formatPrice } from "@/lib/format";

export function Filters({ facets, query, showCategories }: { facets: Facets; query: CatalogQuery; showCategories: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active =
    (query.sizes?.length ?? 0) + (query.colors?.length ?? 0) + (query.gender ? 1 : 0) + (query.age ? 1 : 0) + (query.priceMin || query.priceMax ? 1 : 0) + (showCategories && query.category ? 1 : 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-outline h-10 gap-2 px-4 text-[13px] lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" /> {t.catalog.filters}
        {active > 0 && <span className="rounded-full bg-rose-600 px-1.5 text-[10px] text-white">{active}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white animate-slide-in-left">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <p className="font-semibold">{t.catalog.filters}</p>
              <button type="button" onClick={() => setOpen(false)} className="-mr-2 p-2" aria-label={t.nav.close}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FilterBody facets={facets} query={query} showCategories={showCategories} />
            </div>
            <div className="border-t border-line p-4">
              <button type="button" onClick={() => setOpen(false)} className="btn-primary w-full">
                {t.catalog.apply}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function FilterSidebar({ facets, query, showCategories }: { facets: Facets; query: CatalogQuery; showCategories: boolean }) {
  return <FilterBody facets={facets} query={query} showCategories={showCategories} />;
}

function useUpdateParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const update = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mutate(p);
    p.delete("page");
    start(() => router.push(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false }));
  };
  return { update, pending, sp };
}

function FilterBody({ facets, query, showCategories }: { facets: Facets; query: CatalogQuery; showCategories: boolean }) {
  const { t, href } = useI18n();
  const router = useRouter();
  const { update, sp } = useUpdateParams();

  const toggleMulti = (key: string, value: string) =>
    update((p) => {
      const cur = p.get(key)?.split(",").filter(Boolean) ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      if (next.length) p.set(key, next.join(","));
      else p.delete(key);
    });
  const setOne = (key: string, value: string | null) =>
    update((p) => {
      if (value === null || p.get(key) === value) p.delete(key);
      else p.set(key, value);
    });

  const hasAny = sp.toString().length > 0;

  return (
    <div className="flex flex-col gap-7">
      {hasAny && (
        <button
          type="button"
          onClick={() => router.push(href(window.location.pathname.replace(/^\/(ru|kk)/, "")))}
          className="self-start text-[12px] font-semibold uppercase tracking-wider text-rose-700 hover:text-rose-800"
        >
          {t.catalog.reset}
        </button>
      )}

      {showCategories && facets.categories.length > 1 && (
        <Group title={t.catalog.category}>
          <ul className="flex flex-col gap-1.5">
            {facets.categories.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => setOne("category", c.slug)}
                  className={cn(
                    "flex w-full items-center justify-between text-left text-[14px] transition hover:text-rose-700",
                    query.category === c.slug ? "font-semibold text-rose-700" : "text-ink-soft",
                  )}
                >
                  {t.categories[c.slug]} <span className="text-[11px] text-muted/70 tabular-nums">{c.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </Group>
      )}

      <Group title={t.catalog.gender}>
        <Chips
          options={[
            { v: "girl", l: t.catalog.girl },
            { v: "boy", l: t.catalog.boy },
            { v: "unisex", l: t.catalog.unisex },
          ]}
          selected={query.gender ? [query.gender] : []}
          onToggle={(v) => setOne("gender", v)}
        />
      </Group>

      <Group title={t.catalog.age}>
        <Chips
          options={[
            { v: "newborn", l: t.catalog.newborn },
            { v: "toddler", l: t.catalog.toddler },
          ]}
          selected={query.age ? [query.age] : []}
          onToggle={(v) => setOne("age", v)}
        />
      </Group>

      {facets.sizes.length > 0 && (
        <Group title={t.catalog.size}>
          <Chips
            options={facets.sizes.map((s) => ({ v: s.value, l: s.value }))}
            selected={query.sizes ?? []}
            onToggle={(v) => toggleMulti("size", v)}
            small
          />
        </Group>
      )}

      {facets.colors.length > 0 && (
        <Group title={t.catalog.color}>
          <div className="flex flex-wrap gap-2.5">
            {facets.colors.map((c) => {
              const on = (query.colors ?? []).includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  title={c.value}
                  aria-pressed={on}
                  onClick={() => toggleMulti("color", c.value)}
                  className={cn(
                    "relative flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-black/10 transition",
                    on && "ring-2 ring-rose-600 ring-offset-2",
                  )}
                  style={{ background: c.hex }}
                >
                  {on && <Check className={cn("h-3.5 w-3.5", isLight(c.hex) ? "text-ink" : "text-white")} />}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      <Group title={t.catalog.price}>
        <PriceRange key={`${query.priceMin ?? ""}-${query.priceMax ?? ""}`} min={facets.priceMin} max={facets.priceMax} curMin={query.priceMin} curMax={query.priceMax} onApply={(a, b) => update((p) => {
          if (a) p.set("min", String(a)); else p.delete("min");
          if (b) p.set("max", String(b)); else p.delete("max");
        })} />
      </Group>
    </div>
  );
}

function isLight(hex: string) {
  if (!hex.startsWith("#")) return true;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="mb-3 flex w-full items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", !open && "-rotate-90")} />
      </button>
      {open && children}
    </div>
  );
}

function Chips({ options, selected, onToggle, small }: { options: { v: string; l: string }[]; selected: string[]; onToggle: (v: string) => void; small?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.v);
        return (
          <button
            key={o.v}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.v)}
            className={cn(
              "rounded-full border transition",
              small ? "px-3 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]",
              on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink",
            )}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function PriceRange({ min, max, curMin, curMax, onApply }: { min: number; max: number; curMin?: number; curMax?: number; onApply: (a: number | null, b: number | null) => void }) {
  const { t } = useI18n();
  const [a, setA] = useState(curMin ? String(curMin) : "");
  const [b, setB] = useState(curMax ? String(curMax) : "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply(Number(a) || null, Number(b) || null);
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <input inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} placeholder={`${t.catalog.priceFrom} ${min}`} className="input h-10 px-3 text-[13px]" />
        <span className="text-muted">–</span>
        <input inputMode="numeric" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, ""))} placeholder={`${t.catalog.priceTo} ${max}`} className="input h-10 px-3 text-[13px]" />
      </div>
      <button type="submit" className="btn-outline h-9 text-[12px]">
        {t.catalog.apply}
      </button>
      <p className="text-[11px] text-muted">
        {formatPrice(min)} – {formatPrice(max)}
      </p>
    </form>
  );
}
