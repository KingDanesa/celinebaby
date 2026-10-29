import { formatPrice, cn } from "@/lib/format";

export function Price({
  price,
  oldPrice,
  className,
  size = "md",
}: {
  price: number;
  oldPrice?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-sm", md: "text-[15px]", lg: "text-2xl" };
  return (
    <span className={cn("inline-flex items-baseline gap-2 font-semibold tabular-nums", sizes[size], className)}>
      <span className={oldPrice ? "text-rose-700" : "text-ink"}>{formatPrice(price)}</span>
      {oldPrice && oldPrice > price && (
        <span className="text-muted line-through decoration-muted/70 font-normal text-[0.85em]">{formatPrice(oldPrice)}</span>
      )}
    </span>
  );
}
