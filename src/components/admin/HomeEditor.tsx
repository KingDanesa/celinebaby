"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Film, ImagePlus, Loader2, Monitor, RotateCcw, Smartphone, X } from "lucide-react";
import { resetHomeBlockAction, saveHomeBlockAction } from "@/lib/admin/home-actions";
import { uploadImageFile } from "@/components/admin/ImageUploader";
import { BLOCK_NAMES, HAS_SUB, TILE_KEYS, type Benefit, type BlockKey, type Focus, type HomeContent, type HomeOverrides, type HomeTile, type L, type Media, type StoreBlock, type TileKey } from "@/lib/home-types";
import { cn, imageUrl } from "@/lib/format";

/** Shapes of the blocks on the site, to preview the crop. */
const COMPUTER_ASPECT: Record<TileKey, string> = {
  newborn: "10 / 9",
  toddler: "10 / 9",
  outer: "1 / 1",
  bodysuits: "1 / 1",
  sets: "1 / 1",
  hats: "1 / 1",
  discharge: "16 / 10",
};

const label = "text-[11px] font-semibold uppercase tracking-wider text-ink-soft";

function TextPair({ title, value, onChange, max, placeholderKk = "пусто — как по-русски" }: { title: string; value: L; onChange: (v: L) => void; max: number; placeholderKk?: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className={label}>{title} — по-русски</span>
        <input value={value.ru} maxLength={max} onChange={(e) => onChange({ ...value, ru: e.target.value })} className="input" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>{title} — на казахском</span>
        <input value={value.kk} maxLength={max} placeholder={placeholderKk} onChange={(e) => onChange({ ...value, kk: e.target.value })} className="input" />
      </label>
    </div>
  );
}

/** Browsers often do not autoplay a video that React adds later, so it is started by hand. */
function Video({ media, className, style, onRatio }: { media: Media; className?: string; style?: React.CSSProperties; onRatio?: (r: number) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
    // The metadata may already be there before React attached the handler.
    if (v.readyState >= 1 && v.videoWidth) onRatio?.(v.videoWidth / v.videoHeight);
  }, [media.src, onRatio]);
  return (
    <video
      ref={ref}
      key={media.src}
      className={cn("absolute inset-0 h-full w-full", className)}
      style={style}
      autoPlay
      muted
      loop
      playsInline
      poster={media.poster ? imageUrl(media.poster) : undefined}
      onLoadedMetadata={(e) => e.currentTarget.videoWidth && onRatio?.(e.currentTarget.videoWidth / e.currentTarget.videoHeight)}
    >
      <source src={imageUrl(media.src)} type="video/mp4" />
    </video>
  );
}

function MediaView({ media, className, style, onRatio }: { media: Media; className?: string; style?: React.CSSProperties; onRatio?: (r: number) => void }) {
  return media.kind === "video" ? (
    <Video media={media} className={className} style={style} onRatio={onRatio} />
  ) : (
    <Image
      src={imageUrl(media.src)}
      alt=""
      fill
      sizes="400px"
      className={className}
      style={style}
      onLoad={(e) => e.currentTarget.naturalWidth && onRatio?.(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
    />
  );
}

/** Uploads a video with a progress bar; the server converts it to a light MP4 with a poster. */
function uploadVideo(file: File, onProgress: (p: number) => void): Promise<Media> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload-video");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status === 200) resolve({ kind: "video", src: res.url, poster: res.poster });
        else reject(new Error(xhr.status === 413 ? "too large" : res.error || String(xhr.status)));
      } catch {
        reject(new Error(xhr.status === 413 ? "too large" : String(xhr.status)));
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

const UPLOAD_ERRORS: Record<string, string> = {
  "too large": "Файл слишком большой. Видео — до 200 МБ, лучше короткое, 10–20 секунд.",
  "no ffmpeg": "На сервере не установлена программа для обработки видео (ffmpeg).",
  "convert failed": "Не получилось обработать это видео. Попробуйте другое или снимите заново.",
  "unsupported type": "Этот формат не подходит. Нужны фото (JPG, PNG) или видео (MP4, MOV).",
  network: "Пропала связь. Попробуйте ещё раз.",
};

/** Shows the photo/video whole; a click marks the point that must stay in view. */
function MediaPicker({ title, media, focus, onMedia, onFocus, onRemove }: { title: string; media: Media; focus: Focus; onMedia: (m: Media) => void; onFocus: (f: Focus) => void; onRemove?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | { stage: "upload" | "convert"; p: number }>(null);
  const [error, setError] = useState<string | null>(null);
  /** Width / height of the file, so the frame has its shape and a click maps exactly onto it. */
  const [ratio, setRatio] = useState(4 / 3);

  const pickFile = async (file: File) => {
    setError(null);
    try {
      if (file.type.startsWith("image/")) {
        setBusy({ stage: "upload", p: 0 });
        const { url } = await uploadImageFile(file);
        onMedia({ kind: "image", src: url });
      } else if (file.type.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(file.name)) {
        setBusy({ stage: "upload", p: 0 });
        const m = await uploadVideo(file, (p) => setBusy({ stage: p >= 1 ? "convert" : "upload", p }));
        onMedia(m);
      } else {
        setError(UPLOAD_ERRORS["unsupported type"]);
      }
    } catch (e) {
      setError(UPLOAD_ERRORS[(e as Error).message] ?? "Не удалось загрузить. Попробуйте ещё раз.");
    } finally {
      setBusy(null);
    }
  };

  const click = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onFocus({ x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className={label}>{title}</span>
        <span className="flex items-center gap-1 text-[12px] text-muted">
          {media.kind === "video" ? <Film className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {media.kind === "video" ? "видео" : "фото"}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-xl bg-ink/90">
        {/* The whole frame, uncropped, in the file's own shape (at most 420 px tall). */}
        <div className="relative mx-auto cursor-crosshair" onClick={click} style={{ aspectRatio: String(ratio), width: `min(100%, ${Math.round(420 * ratio)}px)` }}>
          <MediaView media={media} className="object-cover" onRatio={setRatio} />
          <span
            className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-rose-600/70 shadow-[0_0_0_3px_rgba(0,0,0,0.25)]"
            style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
          />
        </div>
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/70 px-4 text-center text-[13px] text-white">
            <Loader2 className="h-5 w-5 animate-spin" />
            {busy.stage === "upload" ? `Загружаем… ${Math.round(busy.p * 100)}%` : "Обрабатываем видео, это может занять до минуты…"}
          </div>
        )}
      </div>
      <p className="text-[12px] text-muted">Нажмите на кадр туда, что должно быть видно всегда, — например, на лицо ребёнка. Остальное может обрезаться.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!busy} onClick={() => input.current?.click()} className="btn-outline px-4 py-2 text-[12px]">
          <ImagePlus className="h-4 w-4" /> Заменить фото или видео
        </button>
        {onRemove && (
          <button type="button" onClick={onRemove} className="flex items-center gap-1 rounded-full px-3 py-2 text-[12px] text-rose-700 ring-1 ring-line hover:ring-rose-700">
            <X className="h-3.5 w-3.5" /> Убрать, как на компьютере
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mov,.mp4"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) pickFile(f);
        }}
      />
      {error && <p className="rounded-xl bg-rose-100 px-3 py-2 text-[12px] text-rose-800">{error}</p>}
    </div>
  );
}

function Frame({ media, focus, aspect, title, sub, icon, caption, width }: { media: Media; focus: Focus; aspect: string; title: string; sub: string; icon: React.ReactNode; caption: string; width: string }) {
  return (
    <div style={{ width }} className="shrink-0">
      <p className="mb-1 flex items-center gap-1.5 text-[12px] text-muted">
        {icon} {caption}
      </p>
      <div className="relative overflow-hidden rounded-lg bg-sand" style={{ aspectRatio: aspect }}>
        <MediaView media={media} className="object-cover" style={{ objectPosition: `${focus.x}% ${focus.y}%` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-2 text-center text-white [text-shadow:0_1px_8px_rgba(43,14,20,0.6)]">
          <p className="display-caps text-[13px] leading-tight">{title}</p>
          {sub && <p className="text-[10px]">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

type Links = { value: string; label: string }[];

function BlockShell({
  id,
  changed,
  custom,
  dirty,
  onSave,
  onReset,
  children,
}: {
  id: BlockKey;
  changed: boolean;
  custom: boolean;
  dirty: boolean;
  onSave: () => Promise<string | null>;
  onReset: () => Promise<string | null>;
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<string | null>, ok: string) =>
    start(async () => {
      const err = await fn();
      setMsg(err ? { ok: false, text: err } : { ok: true, text: ok });
    });
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <h2 className="text-[14px] font-semibold">{BLOCK_NAMES[id]}</h2>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[12px]", custom ? "bg-mint text-ink" : "bg-sand text-muted")}>{custom ? "изменён" : "как было изначально"}</span>
      </header>
      <div className="flex flex-col gap-5 p-5">
        {children}
        {msg && <p className={cn("rounded-xl px-4 py-2 text-[13px]", msg.ok ? "bg-mint text-ink" : "bg-rose-100 text-rose-800")}>{msg.text}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={pending || !dirty} onClick={() => run(onSave, "Сохранено. На сайте уже видно.")} className="btn-primary">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Сохранить
          </button>
          <button
            type="button"
            disabled={pending || (!custom && !changed)}
            onClick={() => {
              if (confirm("Вернуть этот блок как было изначально? Ваши надписи, фото и видео в нём заменятся исходными.")) run(onReset, "Вернули как было.");
            }}
            className="btn-outline"
          >
            <RotateCcw className="h-4 w-4" /> Вернуть как было
          </button>
          {dirty && <span className="text-[12px] text-rose-700">Есть несохранённые изменения</span>}
        </div>
      </div>
    </section>
  );
}

function TileEditor({ id, initial, fallback, custom, links }: { id: TileKey; initial: HomeTile; fallback: HomeTile; custom: boolean; links: Links }) {
  const router = useRouter();
  const [t, setT] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const set = (p: Partial<HomeTile>) => setT((x) => ({ ...x, ...p }));
  const hasSub = HAS_SUB.includes(id);
  const title = t.title.ru.trim();
  const sub = t.sub.ru.trim();
  const phoneMedia = t.mobile ?? t.media;

  return (
    <BlockShell
      id={id}
      custom={custom}
      changed={JSON.stringify(t) !== JSON.stringify(fallback)}
      dirty={JSON.stringify(t) !== JSON.stringify(saved)}
      onSave={async () => {
        const r = await saveHomeBlockAction(id, t);
        if (!r.ok) return r.error;
        setSaved(t);
        router.refresh();
        return null;
      }}
      onReset={async () => {
        const r = await resetHomeBlockAction(id);
        if (!r.ok) return r.error;
        setT(fallback);
        setSaved(fallback);
        router.refresh();
        return null;
      }}
    >
      <TextPair title="Надпись" value={t.title} max={40} onChange={(v) => set({ title: v })} />
      {hasSub && <TextPair title="Подпись под надписью" value={t.sub} max={50} onChange={(v) => set({ sub: v })} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <MediaPicker
          title="Фото или видео"
          media={t.media}
          focus={t.focus}
          onMedia={(m) => set({ media: m, focus: { x: 50, y: 50 }, ...(t.mobile ? {} : { focusMobile: { x: 50, y: 50 } }) })}
          onFocus={(f) => set({ focus: f, ...(t.mobile ? {} : { focusMobile: f }) })}
        />
        {t.mobile ? (
          <MediaPicker
            title="Отдельно для телефона"
            media={t.mobile}
            focus={t.focusMobile}
            onMedia={(m) => set({ mobile: m, focusMobile: { x: 50, y: 50 } })}
            onFocus={(f) => set({ focusMobile: f })}
            onRemove={() => set({ mobile: null, focusMobile: t.focus })}
          />
        ) : (
          <div className="flex flex-col justify-center gap-2 rounded-xl border border-dashed border-line p-5 text-center">
            <Smartphone className="mx-auto h-5 w-5 text-muted" />
            <p className="text-[13px] text-ink-soft">На телефоне показывается то же фото или видео. Если на телефоне оно обрезается неудачно, можно поставить отдельное.</p>
            <button type="button" onClick={() => set({ mobile: t.media })} className="btn-outline mx-auto px-4 py-2 text-[12px]">
              Поставить отдельное для телефона
            </button>
          </div>
        )}
      </div>

      <div>
        <p className={cn(label, "mb-2")}>Как будет на сайте</p>
        <div className="flex flex-wrap items-end gap-4">
          <Frame media={t.media} focus={t.focus} aspect={COMPUTER_ASPECT[id]} title={title} sub={sub} icon={<Monitor className="h-3.5 w-3.5" />} caption="Компьютер" width="min(100%, 300px)" />
          <Frame media={phoneMedia} focus={t.focusMobile} aspect="4 / 5" title={title} sub={sub} icon={<Smartphone className="h-3.5 w-3.5" />} caption="Телефон" width="min(100%, 170px)" />
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={label}>Куда ведёт нажатие</span>
        <input value={t.link} list="home-links" onChange={(e) => set({ link: e.target.value })} placeholder="Выберите из списка или вставьте адрес страницы" className="input" />
        <span className="text-[12px] text-muted">{links.find((l) => l.value === t.link)?.label ?? (t.link ? "Своя ссылка" : "Выберите, куда ведёт нажатие")}</span>
      </label>
    </BlockShell>
  );
}

function StoreEditor({ initial, fallback, custom }: { initial: StoreBlock; fallback: StoreBlock; custom: boolean }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const set = (p: Partial<StoreBlock>) => setS((x) => ({ ...x, ...p }));
  return (
    <BlockShell
      id="store"
      custom={custom}
      changed={JSON.stringify(s) !== JSON.stringify(fallback)}
      dirty={JSON.stringify(s) !== JSON.stringify(saved)}
      onSave={async () => {
        const r = await saveHomeBlockAction("store", s);
        if (!r.ok) return r.error;
        setSaved(s);
        router.refresh();
        return null;
      }}
      onReset={async () => {
        const r = await resetHomeBlockAction("store");
        if (!r.ok) return r.error;
        setS(fallback);
        setSaved(fallback);
        router.refresh();
        return null;
      }}
    >
      <TextPair title="Заголовок" value={s.title} max={40} onChange={(v) => set({ title: v })} />
      <TextPair title="Адрес" value={s.address} max={60} onChange={(v) => set({ address: v })} />
      <TextPair title="Часы работы" value={s.hours} max={60} onChange={(v) => set({ hours: v })} />
      <TextPair title="Надпись на кнопке" value={s.cta} max={30} onChange={(v) => set({ cta: v })} />
      <label className="flex flex-col gap-1.5">
        <span className={label}>Ссылка на карту</span>
        <input value={s.map} onChange={(e) => set({ map: e.target.value })} placeholder="https://2gis.kz/…" className="input" />
        <span className="text-[12px] text-muted">Скопируйте ссылку на магазин из 2ГИС или Яндекс Карт. Пусто — кнопки не будет.</span>
      </label>
    </BlockShell>
  );
}

function BenefitsEditor({ initial, fallback, custom }: { initial: Benefit[]; fallback: Benefit[]; custom: boolean }) {
  const router = useRouter();
  const [b, setB] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const set = (i: number, p: Partial<Benefit>) => setB((x) => x.map((y, j) => (j === i ? { ...y, ...p } : y)));
  return (
    <BlockShell
      id="benefits"
      custom={custom}
      changed={JSON.stringify(b) !== JSON.stringify(fallback)}
      dirty={JSON.stringify(b) !== JSON.stringify(saved)}
      onSave={async () => {
        const r = await saveHomeBlockAction("benefits", b);
        if (!r.ok) return r.error;
        setSaved(b);
        router.refresh();
        return null;
      }}
      onReset={async () => {
        const r = await resetHomeBlockAction("benefits");
        if (!r.ok) return r.error;
        setB(fallback);
        setSaved(fallback);
        router.refresh();
        return null;
      }}
    >
      <p className="-mt-1 text-[13px] text-ink-soft">Четыре пункта с иконками внизу главной и на странице «О нас». Иконки остаются те же: щит, грузовик, листик, подарок.</p>
      {b.map((x, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <p className="text-[13px] font-semibold">Пункт {i + 1}</p>
          <TextPair title="Заголовок" value={x.title} max={40} onChange={(v) => set(i, { title: v })} />
          <TextPair title="Текст" value={x.text} max={50} onChange={(v) => set(i, { text: v })} />
        </div>
      ))}
    </BlockShell>
  );
}

export function HomeEditor({ home, defaults, overrides, links }: { home: HomeContent; defaults: HomeContent; overrides: HomeOverrides; links: Links }) {
  return (
    <div className="flex flex-col gap-6">
      <datalist id="home-links">
        {links.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </datalist>
      <nav className="flex flex-wrap gap-2">
        {[...TILE_KEYS, "store" as const, "benefits" as const].map((k) => (
          <a key={k} href={`#${k}`} className="rounded-full bg-white px-3 py-1.5 text-[12px] text-ink-soft ring-1 ring-line hover:ring-ink">
            {BLOCK_NAMES[k].replace(/^.*«(.*)»$/, "$1").replace("Строка преимуществ", "Преимущества")}
          </a>
        ))}
      </nav>
      {TILE_KEYS.map((k) => (
        <TileEditor key={k} id={k} initial={home.tiles[k]} fallback={defaults.tiles[k]} custom={!!overrides[k]} links={links} />
      ))}
      <StoreEditor initial={home.store} fallback={defaults.store} custom={!!overrides.store} />
      <BenefitsEditor initial={home.benefits} fallback={defaults.benefits} custom={!!overrides.benefits} />
    </div>
  );
}
