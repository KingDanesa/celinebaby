"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn, imageUrl } from "@/lib/format";

export function ProductGallery({ images, imagesFull, alt }: { images: string[]; imagesFull: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const n = images.length;
  const prev = () => setIdx((i) => (i - 1 + n) % n);
  const next = () => setIdx((i) => (i + 1) % n);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div className="relative flex-1">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-sand">
          {images.map((src, i) => (
            <Image
              key={src}
              src={imageUrl(src)}
              alt={alt}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 55vw"
              className={cn("object-cover transition-opacity duration-500", i === idx ? "opacity-100" : "opacity-0")}
            />
          ))}
          <button type="button" onClick={() => setZoom(true)} aria-label="Zoom" className="absolute inset-0 cursor-zoom-in" />
          {n > 1 && (
            <>
              <button type="button" onClick={prev} aria-label="Prev" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm backdrop-blur transition hover:bg-white">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={next} aria-label="Next" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm backdrop-blur transition hover:bg-white">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden">
                {images.map((_, i) => (
                  <span key={i} className={cn("h-1.5 rounded-full bg-white transition-all", i === idx ? "w-5" : "w-1.5 opacity-60")} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {n > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:w-20 lg:flex-col lg:overflow-y-auto">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`${i + 1}`}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-sand ring-2 ring-offset-2 ring-offset-cream transition lg:h-24 lg:w-full",
                i === idx ? "ring-rose-600" : "ring-transparent hover:ring-line",
              )}
            >
              <Image src={imageUrl(src)} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 animate-fade-in" onClick={() => setZoom(false)}>
          <button type="button" aria-label="Close" onClick={() => setZoom(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>
          {n > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Prev" className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next" className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div className="relative h-[90vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image src={imageUrl(imagesFull[idx] ?? images[idx])} alt={alt} fill sizes="90vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
