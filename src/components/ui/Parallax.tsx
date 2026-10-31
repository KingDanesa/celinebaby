"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/format";

/**
 * Moves its content slightly slower than the page (subtle depth on big photo
 * tiles). Content is scaled up a little so no empty edges appear. Disabled on
 * phones and for "reduce motion".
 */
export function Parallax({ children, className, strength = 0.08 }: { children: React.ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    let raf = 0;
    let active = false;

    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      const centre = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(-centre * strength).toFixed(1)}px, 0) scale(1.08)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const enable = () => {
      if (active) return;
      active = true;
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      update();
    };
    const disable = () => {
      if (!active) return;
      active = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el.style.transform = "";
    };
    const apply = () => (mq.matches ? enable() : disable());
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      disable();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <div ref={ref} className={cn("absolute inset-0 will-change-transform", className)}>
      {children}
    </div>
  );
}
