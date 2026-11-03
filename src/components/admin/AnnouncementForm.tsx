"use client";

import { useActionState, useState } from "react";
import { saveAnnouncementAction } from "@/lib/admin/announcement-actions";
import type { Announcement } from "@/lib/announcement";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

/** Edits the strip above the site header, with a live preview. */
export function AnnouncementForm({ value }: { value: Announcement }) {
  const [state, action, pending] = useActionState(saveAnnouncementAction, {});
  const [enabled, setEnabled] = useState(value.enabled);
  const [ru, setRu] = useState<[string, string]>(value.ru);
  const lines = ru.map((s) => s.trim()).filter(Boolean);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Как будет на сайте</p>
        <div className="overflow-hidden rounded-xl bg-burgundy-deep text-white/85">
          {enabled && lines.length > 0 ? (
            <div className="flex min-h-9 flex-wrap items-center justify-center gap-x-6 gap-y-1 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em]">
              {lines.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
          ) : (
            <p className="px-3 py-2.5 text-center text-[12px] text-white/60">Полоска скрыта</p>
          )}
        </div>
        <p className="mt-1.5 text-[12px] text-muted">На телефоне помещается одна строка, поэтому две строки там сменяют друг друга каждые 4 секунды.</p>
      </div>

      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-rose-600" />
        Показывать полоску над шапкой
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Строка 1 — по-русски">
          <input name="ru1" value={ru[0]} onChange={(e) => setRu([e.target.value, ru[1]])} maxLength={80} placeholder="Промокод WINTER — скидка 10%" className="input" />
        </Field>
        <Field label="Строка 2 — по-русски (необязательно)">
          <input name="ru2" value={ru[1]} onChange={(e) => setRu([ru[0], e.target.value])} maxLength={80} placeholder="Бесплатная доставка от 50 000 ₸" className="input" />
        </Field>
        <Field label="Строка 1 — на казахском">
          <input name="kk1" defaultValue={value.kk[0]} maxLength={80} className="input" />
        </Field>
        <Field label="Строка 2 — на казахском (необязательно)">
          <input name="kk2" defaultValue={value.kk[1]} maxLength={80} className="input" />
        </Field>
      </div>
      <p className="-mt-2 text-[12px] text-muted">Если казахские строки пустые, на казахской версии сайта покажется русский текст.</p>

      <Field label="Ссылка при нажатии (необязательно)" hint="Страница нашего сайта, например /catalog/novinki, или скопированный адрес страницы. Пусто — полоска не нажимается.">
        <input name="link" defaultValue={value.link} placeholder="/catalog/novinki" className="input" />
      </Field>

      {state?.error && <p className="rounded-xl bg-rose-100 px-4 py-2 text-[13px] text-rose-800">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-mint px-4 py-2 text-[13px] text-ink">{state.ok}</p>}
      <div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
