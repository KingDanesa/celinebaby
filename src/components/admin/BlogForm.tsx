"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { AlertCircle, Bold, Check, Eye, Heading2, ImagePlus, Link2, List, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { deleteBlogPostAction, saveBlogPostAction, type BlogInput } from "@/lib/admin/blog-actions";
import { bodyImages, markupToHtml, readingMinutes } from "@/lib/blog-format";
import { slugify } from "@/lib/catalog";
import { cn, imageUrl } from "@/lib/format";
import type { BlogRecord } from "@/lib/types";
import { MIN_GOOD_WIDTH, uploadImageFile } from "./ImageUploader";

const today = () => new Date().toISOString().slice(0, 10);

function initial(r: BlogRecord | null): BlogInput {
  return {
    originalSlug: r?.slug,
    slug: r?.slug ?? "",
    status: r?.status ?? "published",
    date: r?.date ?? today(),
    image: r?.image ?? "",
    title: r?.title ?? "",
    excerpt: r?.excerpt ?? "",
    body: r?.body ?? "",
    titleKk: r?.titleKk ?? "",
    excerptKk: r?.excerptKk ?? "",
    bodyKk: r?.bodyKk ?? "",
  };
}

export function BlogForm({ post, siteUrl }: { post: BlogRecord | null; siteUrl: string }) {
  const router = useRouter();
  const [f, setF] = useState<BlogInput>(() => initial(post));
  const [lang, setLang] = useState<"ru" | "kk">("ru");
  const [preview, setPreview] = useState(false);
  const [slugEdited, setSlugEdited] = useState(!!post);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoNote, setPhotoNote] = useState<string | null>(null);

  const set = <K extends keyof BlogInput>(k: K, v: BlogInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const kk = lang === "kk";
  const titleKey = kk ? "titleKk" : "title";
  const excerptKey = kk ? "excerptKk" : "excerpt";
  const bodyKey = kk ? "bodyKk" : "body";
  const body = (f[bodyKey] as string) ?? "";

  const setTitle = (v: string) => {
    setF((p) => ({ ...p, [titleKey]: v, ...(!kk && !slugEdited ? { slug: slugify(v).slice(0, 100) } : {}) }));
  };

  /** Toolbar: wraps the selection or inserts a template at the cursor. */
  const insert = (kind: "h2" | "list" | "bold" | "link") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const sel = value.slice(a, b);
    const before = value.slice(0, a);
    const nl = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const templates: Record<typeof kind, () => string> = {
      h2: () => `${nl}## ${sel || "Подзаголовок"}\n\n`,
      list: () => `${nl}${(sel || "Пункт списка\nЕщё пункт").split("\n").map((l) => `- ${l.replace(/^[-•]\s*/, "")}`).join("\n")}\n\n`,
      bold: () => `**${sel || "жирный текст"}**`,
      link: () => `[${sel || "текст ссылки"}](/ru/catalog)`,
    };
    const text = templates[kind]();
    const cursor = text.length;
    const next = before + text + value.slice(b);
    set(bodyKey, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + cursor, a + cursor);
    });
  };

  const lines = () => body.replace(/\r\n?/g, "\n").split("\n");

  /** Uploads one photo; returns its URL or null (and shows why). */
  const uploadOne = async (file: File | undefined): Promise<string | null> => {
    if (!file || !file.type.startsWith("image/")) return null;
    setUploading(true);
    setPhotoNote(null);
    try {
      const { url, width } = await uploadImageFile(file);
      if (width < MIN_GOOD_WIDTH) setPhotoNote(`Фото маленькое (${width} px), на телефоне может быть нечётким. Лучше от ${MIN_GOOD_WIDTH} px.`);
      return url;
    } catch {
      setPhotoNote("Не удалось загрузить фото, попробуйте ещё раз.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  /** "Фото" button: puts a photo on its own line where the cursor is. */
  const insertPhoto = async (file: File | undefined) => {
    const el = area.current;
    const pos = el ? el.selectionStart : body.length;
    const url = await uploadOne(file);
    if (!url) return;
    const before = body.slice(0, pos);
    const nl = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    set(bodyKey, `${before}${nl}![](${url})\n\n${body.slice(pos).replace(/^\n+/, "")}`);
  };

  const setImageLine = (line: number, url: string, caption: string) => {
    const ls = lines();
    ls[line] = `![${caption.replace(/[[\]]/g, "")}](${url})`;
    set(bodyKey, ls.join("\n"));
  };

  const removeImageLine = (line: number) => {
    const ls = lines();
    ls.splice(line, 1);
    set(bodyKey, ls.join("\n").replace(/\n{3,}/g, "\n\n"));
  };

  const submit = (status: "published" | "draft") => {
    setError(null);
    start(async () => {
      const res = await saveBlogPostAction(JSON.stringify({ ...f, status }));
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setSaved(true);
      setF((p) => ({ ...p, status, slug: res.slug, originalSlug: res.slug }));
      if (res.slug !== post?.slug) router.replace(`/admin/blog/${res.slug}`);
      else router.refresh();
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(f.status);
      }}
      className="grid gap-6 lg:grid-cols-12"
    >
      <div className="flex flex-col gap-6 lg:col-span-8">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-[14px] text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex gap-2">
          {(["ru", "kk"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cn("rounded-full px-4 py-2 text-[13px] font-semibold", lang === l ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-line hover:ring-ink")}
            >
              {l === "ru" ? "Русский" : "Қазақша (необязательно)"}
            </button>
          ))}
        </div>

        <Section title={kk ? "Текст на казахском" : "Статья"} hint={kk ? "Если поле пустое, на казахской версии сайта покажем русский текст." : undefined}>
          <div className="flex flex-col gap-4">
            <Field label="Заголовок" required={!kk}>
              <input value={(f[titleKey] as string) ?? ""} onChange={(e) => setTitle(e.target.value)} className="input" placeholder={kk ? "" : "Например: Что взять в роддом для малыша"} />
            </Field>
            <Field label="Короткое описание" hint="1–2 предложения. Показывается в списке статей и под заголовком.">
              <textarea value={(f[excerptKey] as string) ?? ""} onChange={(e) => set(excerptKey, e.target.value)} rows={2} className="input resize-y" />
            </Field>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft">
                  Текст {!kk && <span className="text-rose-600">*</span>}
                </span>
                <div className="flex flex-wrap gap-1">
                  {!preview && (
                    <>
                      <Tool onClick={() => insert("h2")} icon={Heading2} label="Подзаголовок" />
                      <Tool onClick={() => insert("list")} icon={List} label="Список" />
                      <Tool onClick={() => insert("bold")} icon={Bold} label="Жирный" />
                      <Tool onClick={() => insert("link")} icon={Link2} label="Ссылка" />
                      <Tool onClick={() => photoInput.current?.click()} icon={uploading ? Loader2 : ImagePlus} label={uploading ? "Загружаем…" : "Фото"} />
                      <input
                        ref={photoInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(e) => {
                          insertPhoto(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </>
                  )}
                  <Tool onClick={() => setPreview((v) => !v)} icon={preview ? Pencil : Eye} label={preview ? "Редактировать" : "Как на сайте"} active={preview} />
                </div>
              </div>
              {preview ? (
                <div className="prose-soft min-h-[420px] rounded-xl border border-line bg-white px-5 py-4 text-[15px]" dangerouslySetInnerHTML={{ __html: markupToHtml(body) || "<p>Пока пусто</p>" }} />
              ) : (
                <textarea
                  ref={area}
                  value={body}
                  onChange={(e) => set(bodyKey, e.target.value)}
                  rows={20}
                  className="input min-h-[420px] resize-y font-sans leading-relaxed"
                  placeholder={"Абзацы разделяйте пустой строкой.\n\n## Подзаголовок\n\n- пункт списка\n- ещё пункт\n\nТекст с **жирным** словом."}
                />
              )}
              <p className="text-[12px] text-muted">
                Абзацы разделяйте пустой строкой. <b>## </b> в начале строки делает подзаголовок, <b>- </b> делает пункт списка, <b>**слово**</b> выделяет жирным.
                Кнопка «Фото» вставляет фото туда, где стоит курсор. Время чтения: ~{readingMinutes(body)} мин.
              </p>
              {photoNote && <p className="rounded-xl bg-cream px-3 py-2 text-[12px] text-ink">{photoNote}</p>}
            </div>

            {bodyImages(body).length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft">Фото в статье · {bodyImages(body).length}</span>
                <ul className="flex flex-col gap-2">
                  {bodyImages(body).map((img, i) => (
                    <PhotoRow
                      key={`${img.line}-${img.url}`}
                      index={i + 1}
                      url={img.url}
                      caption={img.caption}
                      busy={uploading}
                      onCaption={(c) => setImageLine(img.line, img.url, c)}
                      onReplace={async (file) => {
                        const url = await uploadOne(file);
                        if (url) setImageLine(img.line, url, img.caption);
                      }}
                      onRemove={() => removeImageLine(img.line)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>

        <Section title="Обложка" hint="Горизонтальное фото шириной от 1600 px. Показывается в списке статей, на главной и вверху статьи.">
          <CoverPicker
            image={f.image}
            busy={uploading}
            onPick={async (file) => {
              const url = await uploadOne(file);
              if (url) set("image", url);
            }}
            onRemove={() => set("image", "")}
          />
        </Section>
      </div>

      <aside className="lg:col-span-4">
        <div className="sticky top-6 flex flex-col gap-4">
          <Section title="Публикация">
            <div className="flex flex-col gap-4">
              <Field label="Дата">
                <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="input" />
              </Field>
              <Field label="Адрес статьи" hint={`${siteUrl}/ru/blog/${f.slug || "…"}`}>
                <input
                  value={f.slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    set("slug", e.target.value);
                  }}
                  className="input"
                  placeholder="составится из заголовка"
                />
              </Field>
              <button type="button" disabled={pending} onClick={() => submit("published")} className="btn-primary w-full">
                {saved ? <Check className="h-4 w-4" /> : null}
                {pending ? "Сохраняем…" : saved ? "Сохранено" : "Опубликовать"}
              </button>
              <button type="button" disabled={pending} onClick={() => submit("draft")} className="btn-outline w-full">
                Сохранить как черновик
              </button>
              <p className="text-[12px] leading-relaxed text-muted">
                {f.status === "draft" ? "Сейчас статья скрыта с сайта (черновик)." : post ? "Статья показывается на сайте." : "Черновики не видны посетителям."}
              </p>
              {post && f.status === "published" && (
                <a href={`/ru/blog/${f.slug}`} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-rose-700 hover:text-rose-900">
                  Открыть на сайте →
                </a>
              )}
            </div>
          </Section>

          {post && (
            <Section title="Удаление">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-[14px] text-rose-700 hover:text-rose-900">
                  <Trash2 className="h-4 w-4" /> Удалить статью
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-ink-soft">Удалить статью навсегда?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => start(() => deleteBlogPostAction(post.slug))} className="btn-primary flex-1 bg-rose-700 px-3">
                      Удалить
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="btn-outline flex-1 px-3">
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      </aside>
    </form>
  );
}

function FileButton({ onFile, children, className }: { onFile: (f: File | undefined) => void; children: React.ReactNode; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} className={className}>
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}

function CoverPicker({ image, busy, onPick, onRemove }: { image: string; busy: boolean; onPick: (f: File | undefined) => void; onRemove: () => void }) {
  if (!image) {
    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onPick(e.dataTransfer.files?.[0]);
        }}
      >
        <FileButton
          onFile={onPick}
          className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-[14px] text-muted transition hover:border-rose-400 hover:text-rose-700"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          {busy ? "Загружаем…" : "Выбрать обложку или перетащить сюда"}
        </FileButton>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-sand">
        <Image src={imageUrl(image)} alt="" fill sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Loader2 className="h-6 w-6 animate-spin text-ink" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <FileButton onFile={onPick} className="btn-outline px-4 py-2 text-[12px]">
          <RefreshCw className="h-3.5 w-3.5" /> Заменить
        </FileButton>
        <button type="button" onClick={onRemove} className="btn-outline px-4 py-2 text-[12px] text-rose-700">
          <Trash2 className="h-3.5 w-3.5" /> Удалить
        </button>
      </div>
    </div>
  );
}

function PhotoRow({
  index,
  url,
  caption,
  busy,
  onCaption,
  onReplace,
  onRemove,
}: {
  index: number;
  url: string;
  caption: string;
  busy: boolean;
  onCaption: (c: string) => void;
  onReplace: (f: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line p-2">
      <span className="w-5 shrink-0 text-center text-[12px] text-muted">{index}</span>
      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-sand">
        <Image src={imageUrl(url)} alt="" fill sizes="96px" className="object-cover" />
      </div>
      <input value={caption} onChange={(e) => onCaption(e.target.value)} placeholder="Подпись под фото (необязательно)" className="input min-w-0 flex-1 py-2 text-[13px]" />
      <FileButton onFile={onReplace} className="shrink-0 rounded-lg px-2 py-1.5 text-[12px] text-ink-soft ring-1 ring-line hover:ring-ink">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Заменить"}
      </FileButton>
      <button type="button" onClick={onRemove} aria-label="Удалить фото" className="shrink-0 rounded-lg p-1.5 text-rose-700 ring-1 ring-line hover:ring-rose-700">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function Tool({ onClick, icon: Icon, label, active }: { onClick: () => void; icon: typeof Bold; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] ring-1 transition", active ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-line hover:ring-ink")}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft">
        {label} {required && <span className="text-rose-600">*</span>}
      </span>
      {children}
      {hint && <span className="break-all text-[12px] text-muted">{hint}</span>}
    </label>
  );
}
