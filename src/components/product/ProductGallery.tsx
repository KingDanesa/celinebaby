"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn, imageUrl } from "@/lib/format";

/**
 * Product photos as a native swipe carousel (scroll-snap): a finger swipe on phones,
 * arrows and thumbnails on desktop. Tapping a photo opens it full screen, also swipeable.
 */
export function ProductGallery({ images, imagesFull, alt }: { images: string[]; imagesFull: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const n = images.length;
  const track = useRef<HTMLDivElement>(null);
  const zoomTrack = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (i: number, smooth = true) => {
      const target = (i + n) % n;
      for (const el of [track.current, zoomTrack.current]) {
        if (el) el.scrollTo({ left: target * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
      }
      setIdx(target);
    },
    [n],
  );

  // Keep the index in sync with the finger: the slide whose centre is closest wins.
  const onScroll = (el: HTMLDivElement | null) => {
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx && i >= 0 && i < n) setIdx(i);
  };

  // Bring the active thumbnail into view.
  useEffect(() => {
    const t = thumbs.current?.children[idx] as HTMLElement | undefined;
    t?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [idx]);

  useEffect(() => {
    if (!zoom) return;
    // Open the full-screen view on the current photo.
    requestAnimationFrame(() => {
      const el = zoomTrack.current;
      if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: "instant" });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowLeft") goTo(idx - 1);
      if (e.key === "ArrowRight") goTo(idx + 1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // When the full-screen view closes, show the same photo in the page carousel.
  useEffect(() => {
    if (!zoom) {
      const el = track.current;
      if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: "instant" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div className="relative min-w-0 flex-1">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-sand">
          <div
            ref={track}
            onScroll={() => onScroll(track.current)}
            className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          >
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setZoom(true)}
                aria-label={`${alt}, фото ${i + 1}`}
                className="relative h-full w-full shrink-0 cursor-zoom-in snap-center snap-always"
              >
                <Image src={imageUrl(imagesFull[i] ?? src)} alt={i === 0 ? alt : ""} fill priority={i === 0} loading={i === 1 ? "eager" : undefined} sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />
              </button>
            ))}
          </div>
          {n > 1 && (
            <>
              <button type="button" onClick={() => goTo(idx - 1)} aria-label="Prev" className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm backdrop-blur transition hover:bg-white sm:flex">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => goTo(idx + 1)} aria-label="Next" className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm backdrop-blur transition hover:bg-white sm:flex">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden">
                {images.map((_, i) => (
                  <span key={i} className={cn("h-1.5 rounded-full bg-white shadow-sm transition-all", i === idx ? "w-5" : "w-1.5 opacity-60")} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {n > 1 && (
        <div ref={thumbs} className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto px-0.5 py-1 lg:w-20 lg:flex-col lg:overflow-y-auto lg:px-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}`}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-sand ring-2 ring-offset-2 ring-offset-white transition lg:h-24 lg:w-full",
                i === idx ? "ring-rose-600" : "ring-transparent hover:ring-line",
              )}
            >
              <Image src={imageUrl(src)} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[60] bg-ink/95 animate-fade-in">
          <div
            ref={zoomTrack}
            onScroll={() => onScroll(zoomTrack.current)}
            className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-contain"
          >
            {images.map((src, i) => (
              <div key={src} className="relative h-full w-full shrink-0 snap-center snap-always" onClick={() => setZoom(false)}>
                <Image src={imageUrl(imagesFull[i] ?? src)} alt={alt} fill sizes="100vw" className="object-contain p-2 sm:p-10" />
              </div>
            ))}
          </div>
          <button type="button" aria-label="Close" onClick={() => setZoom(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>
          {n > 1 && (
            <>
              <button type="button" onClick={() => goTo(idx - 1)} aria-label="Prev" className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:block">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={() => goTo(idx + 1)} aria-label="Next" className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:block">
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-[13px] tabular-nums text-white/80">
                {idx + 1} / {n}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
