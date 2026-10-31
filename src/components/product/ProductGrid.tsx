import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { cn } from "@/lib/format";

export function ProductGrid({
  products,
  cols = 4,
  className,
  priorityCount = 0,
}: {
  products: Product[];
  cols?: 3 | 4;
  className?: string;
  priorityCount?: number;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10",
        cols === 4 ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} tone={(i + Math.floor(i / 2)) % 2 ? "blue" : "pink"} />
      ))}
    </div>
  );
}
