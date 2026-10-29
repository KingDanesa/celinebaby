"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

export function SortSelect({ value }: { value: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const options = [
    { v: "popular", l: t.catalog.sortPopular },
    { v: "new", l: t.catalog.sortNew },
    { v: "price-asc", l: t.catalog.sortPriceAsc },
    { v: "price-desc", l: t.catalog.sortPriceDesc },
  ];
  return (
    <label className="relative flex items-center gap-2 text-[13px]">
      <span className="hidden text-muted sm:inline">{t.catalog.sort}:</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => {
            const p = new URLSearchParams(sp.toString());
            if (e.target.value === "popular") p.delete("sort");
            else p.set("sort", e.target.value);
            p.delete("page");
            router.push(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false });
          }}
          className="appearance-none rounded-full border border-line bg-white py-2 pl-4 pr-9 text-[13px] font-medium text-ink hover:border-ink"
        >
          {options.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}
