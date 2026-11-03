"use client";

import { useActionState, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { saveAnnouncementAction } from "@/lib/admin/announcement-actions";
import type { Announcement, AnnouncementItem } from "@/lib/announcement";
import { AnnouncementStrip, stripPairs } from "@/components/layout/AnnouncementStrip";

const MAX_ITEMS = 12;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

type Row = AnnouncementItem & { id: number };

/** Edits the strip above the site header, with a live preview. */
export function AnnouncementForm({ value }: { value: Announcement }) {
  const [state, action, pending] = useActionState(saveAnnouncementAction, {});
  const [enabled, setEnabled] = useState(value.enabled);
  const nextId = useRef(value.items.length);
  const [rows, setRows] = useState<Row[]>(() => value.items.map((it, id) => ({ ...it, id })));

  const set = (id: number, patch: Partial<AnnouncementItem>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const c = [...r];
      [c[i], c[i + d]] = [c[i + d], c[i]];
      return c;
    });
  const add = () => setRows((r) => [...r, { id: nextId.current++, ru: "", kk: "", link: "" }]);

  const preview = enabled ? rows.filter((r) => r.ru.trim()).map((r) => ({ text: r.ru.trim(), link: "" })) : [];
  const pairs = stripPairs(preview.length);
  const btn = "rounded-lg p-1.5 text-ink-soft ring-1 ring-line transition hover:text-ink hover:ring-ink disabled:opacity-30 disabled:hover:ring-line";

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Как будет на сайте</p>
        {preview.length ? (
          <>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[12px] text-muted">
                <Monitor className="h-3.5 w-3.5" /> Компьютер — по две надписи
              </p>
              <div className="overflow-hidden rounded-xl">
                <AnnouncementStrip items={preview} view="computer" />
              </div>
            </div>
            <div className="max-w-[375px]">
              <p className="mb-1 flex items-center gap-1.5 text-[12px] text-muted">
                <Smartphone className="h-3.5 w-3.5" /> Телефон — по одной
              </p>
              <div className="overflow-hidden rounded-xl">
                <AnnouncementStrip items={preview} view="phone" />
              </div>
            </div>
            {preview.length > 1 && (
              <p className="text-[12px] text-muted">
                Меняются каждые 4 секунды. На компьютере по порядку: {pairs.map((p) => p.map((n) => n + 1).join(" + ")).join(" → ")}
                {preview.length > 2 && " → и снова сначала"}.
              </p>
            )}
          </>
        ) : (
          <p className="rounded-xl bg-burgundy-deep px-3 py-2.5 text-center text-[12px] text-white/60">Полоска скрыта</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-rose-600" />
        Показывать полоску над шапкой
      </label>

      <ol className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.id} className="rounded-2xl border border-line p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">Надпись {i + 1}</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={btn} aria-label="Выше">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className={btn} aria-label="Ниже">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} className={`${btn} text-rose-700 hover:text-rose-700`} aria-label="Удалить">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="По-русски">
                <input name="ru" value={r.ru} onChange={(e) => set(r.id, { ru: e.target.value })} maxLength={80} placeholder="Промокод WINTER — скидка 10%" className="input" />
              </Field>
              <Field label="На казахском (пусто — как по-русски)">
                <input name="kk" value={r.kk} onChange={(e) => set(r.id, { kk: e.target.value })} maxLength={80} className="input" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Ссылка при нажатии (необязательно)">
                  <input name="link" value={r.link} onChange={(e) => set(r.id, { link: e.target.value })} placeholder="/catalog/novinki или скопированный адрес страницы" className="input" />
                </Field>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {rows.length < MAX_ITEMS && (
        <div>
          <button type="button" onClick={add} className="btn-outline">
            <Plus className="h-4 w-4" /> Добавить надпись
          </button>
        </div>
      )}

      {state?.error && <p className="rounded-xl bg-rose-100 px-4 py-2 text-[13px] text-rose-800">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-mint px-4 py-2 text-[13px] text-ink">{state.ok}</p>}
      <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-line bg-white/95 px-5 py-4 backdrop-blur">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
