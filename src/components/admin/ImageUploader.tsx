"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import { imageUrl, cn } from "@/lib/format";

const MAX_SIDE = 1600;

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/jpeg", 0.86),
  );
}

export function ImageUploader({ images, onChange }: { images: string[]; onChange: (next: string[]) => void }) {
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    setError(null);
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy((b) => b + list.length);
    const added: string[] = [];
    for (const file of list) {
      try {
        const blob = await shrink(file);
        const fd = new FormData();
        fd.append("file", new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error(await res.text());
        const { url } = (await res.json()) as { url: string };
        added.push(url);
      } catch (e) {
        setError(`Не удалось загрузить ${file.name}`);
        console.error(e);
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (added.length) onChange([...images, ...added]);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {images.map((src, i) => (
          <div key={src} className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-sand ring-1 ring-line">
            <Image src={imageUrl(src)} alt="" fill sizes="160px" className="object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">Главное</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-ink/70 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
              <button type="button" aria-label="Левее" onClick={() => move(i, -1)} className="rounded-full bg-white/90 p-1 text-ink disabled:opacity-30" disabled={i === 0}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="Правее" onClick={() => move(i, 1)} className="rounded-full bg-white/90 p-1 text-ink disabled:opacity-30" disabled={i === images.length - 1}>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              aria-label="Удалить фото"
              onClick={() => onChange(images.filter((_, k) => k !== i))}
              className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-ink opacity-0 transition hover:text-rose-700 group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
          className={cn(
            "flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-[12px] text-muted transition hover:border-rose-400 hover:text-rose-700",
            busy > 0 && "pointer-events-none",
          )}
        >
          {busy > 0 ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          {busy > 0 ? `Загрузка ${busy}…` : "Добавить фото"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) upload(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-[12px] text-rose-700">{error}</p>}
      <p className="mt-2 text-[12px] text-muted">JPG, PNG или WebP. Можно выбрать сразу несколько или перетащить файлы на плитку.</p>
    </div>
  );
}
