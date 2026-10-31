"use client";

import { useEffect, useRef, type ElementType } from "react";
import { cn } from "@/lib/format";

/**
 * Fades a block in when it scrolls into view. Pure CSS transition driven by a
 * one-shot IntersectionObserver; `delay` (ms) staggers items in a grid.
 * Without JS (or with "reduce motion") content is simply visible.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  variant = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  variant?: "up" | "fade" | "scale";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={cn("reveal", `reveal-${variant}`, className)} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
