import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { Reveal } from "@/components/ui/Reveal";
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
        <Reveal key={p.id} delay={(i % cols) * 70}>
          <ProductCard product={p} priority={i < priorityCount} tone={(i + Math.floor(i / 2)) % 2 ? "blue" : "pink"} />
        </Reveal>
      ))}
    </div>
  );
}
