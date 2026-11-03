"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deletePromoAction, savePromoAction, type PromoFormState } from "@/lib/admin/promo-actions";
import { cn } from "@/lib/format";

interface PromoValues {
  code: string;
  percent: number;
  startsOn: string;
  endsOn: string;
  active: boolean;
  note: string;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function Messages({ state }: { state?: PromoFormState }) {
  return (
    <>
      {state?.error && <p className="rounded-xl bg-rose-100 px-4 py-2 text-[13px] text-rose-800">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-mint px-4 py-2 text-[13px] text-ink">{state.ok}</p>}
    </>
  );
}

/** Create (no `promo`) or edit an existing promo code. */
export function PromoForm({ promo, today, onDone }: { promo?: PromoValues; today: string; onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (prev: PromoFormState | undefined, fd: FormData) => {
    const res = await savePromoAction(prev, fd);
    if (res.ok && onDone) onDone();
    return res;
  }, {});
  const v = state?.values;
  const edit = !!promo;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="mode" value={edit ? "edit" : "new"} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Название промокода">
          {edit ? (
            <>
              <input type="hidden" name="code" value={promo.code} />
              <input value={promo.code} disabled className="input uppercase opacity-70" />
            </>
          ) : (
            <input name="code" required defaultValue={v?.code} placeholder="WINTER" autoComplete="off" className="input uppercase" onInput={(e) => (e.currentTarget.value = e.currentTarget.value.toUpperCase())} />
          )}
        </Field>
        <Field label="Скидка, %">
          <input name="percent" type="number" min={1} max={90} required defaultValue={v?.percent ?? promo?.percent ?? 10} className="input" />
        </Field>
        <Field label="Действует с">
          <input name="startsOn" type="date" required defaultValue={v?.startsOn ?? promo?.startsOn ?? today} className="input" />
        </Field>
        <Field label="Действует по">
          <input name="endsOn" type="date" required defaultValue={v?.endsOn ?? promo?.endsOn} className="input" />
        </Field>
      </div>
      <Field label="Заметка для себя (необязательно)">
        <input name="note" defaultValue={v?.note ?? promo?.note} placeholder="Например: для подписчиков Instagram" className="input" />
      </Field>
      {edit && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="active" defaultChecked={promo.active} className="h-4 w-4 accent-rose-600" />
          Промокод включён
        </label>
      )}
      <Messages state={state} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {edit ? null : <Plus className="h-4 w-4" />}
          {pending ? "Сохраняем…" : edit ? "Сохранить" : "Создать промокод"}
        </button>
        {edit && onDone && (
          <button type="button" onClick={onDone} className="btn-outline">
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}

export function PromoRowActions({ promo, today }: { promo: PromoValues; today: string }) {
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<PromoFormState>({});
  const [pending, start] = useTransition();
  if (editing) {
    return (
      <div className="mt-3 w-full rounded-2xl bg-sand p-4">
        <PromoForm promo={promo} today={today} onDone={() => setEditing(false)} />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] ring-1 ring-line hover:ring-ink">
          <Pencil className="h-3.5 w-3.5" /> Изменить
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(`Удалить промокод ${promo.code}? Уже оформленные заказы со скидкой не изменятся.`)) start(async () => setMsg(await deletePromoAction(promo.code)));
          }}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] text-rose-700 ring-1 ring-line hover:ring-rose-700"
        >
          <Trash2 className="h-3.5 w-3.5" /> Удалить
        </button>
      </div>
      {msg.error && <p className="text-[12px] text-rose-700">{msg.error}</p>}
    </div>
  );
}
