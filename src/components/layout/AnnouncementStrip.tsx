"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/format";

export interface StripItem {
  text: string;
  /** Ready-to-use href, or "" when the line is not clickable. */
  link: string;
}

/**
 * Pairs shown on a computer, two lines at a time: 1+2, 3+4, … With an odd number the last line
 * goes with the first one, so for three lines it is 1+2, then 1+3.
 */
export function stripPairs(n: number): number[][] {
  if (n <= 2) return [Array.from({ length: n }, (_, i) => i)];
  const pairs: number[][] = [];
  for (let k = 0; k + 1 < n; k += 2) pairs.push([k, k + 1]);
  if (n % 2) pairs.push([0, n - 1]);
  return pairs;
}

const STEP = 4000;

function useTick(count: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % count), STEP);
    return () => clearInterval(id);
  }, [count]);
  return count ? i % count : 0;
}

function Line({ item }: { item: StripItem }) {
  const cls = "max-w-full truncate";
  return item.link ? (
    <Link href={item.link} className={cn(cls, "transition hover:text-white")}>
      {item.text}
    </Link>
  ) : (
    <span className={cls}>{item.text}</span>
  );
}

/**
 * The thin strip above the header. `view` forces one layout (for the admin preview);
 * by default a phone shows one line at a time and a computer two.
 */
export function AnnouncementStrip({ items, view }: { items: StripItem[]; view?: "phone" | "computer" }) {
  const pairs = stripPairs(items.length);
  const one = useTick(items.length);
  const two = useTick(pairs.length);
  if (items.length === 0) return null;
  const row = "flex h-9 items-center justify-center gap-6 px-4 text-center text-[10.5px] font-semibold uppercase tracking-[0.14em] sm:text-[11px]";
  const phone = (
    <div key={`p${one}`} className={cn(row, "animate-fade-in", !view && "sm:hidden")}>
      <Line item={items[one]} />
    </div>
  );
  const computer = (
    <div key={`c${two}`} className={cn(row, "animate-fade-in", !view && "hidden sm:flex")}>
      {pairs[two].map((n) => (
        <Line key={n} item={items[n]} />
      ))}
    </div>
  );
  return (
    <div className="bg-burgundy-deep text-white/85">
      <div className="container-x">{view === "phone" ? phone : view === "computer" ? computer : (<>{phone}{computer}</>)}</div>
    </div>
  );
}
