import Image from "next/image";
import { cn } from "@/lib/format";

export function Wordmark({ className, width = 150 }: { className?: string; width?: number }) {
  return (
    <Image
      src="/brand/wordmark.svg"
      alt="Celine Baby"
      width={width}
      height={Math.round((width * 32) / 188)}
      priority
      unoptimized
      className={cn("h-auto", className)}
    />
  );
}

export function Monogram({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/brand/monogram.svg"
      alt=""
      width={size}
      height={Math.round((size * 940) / 1108)}
      unoptimized
      className={cn("h-auto", className)}
      aria-hidden
    />
  );
}
