"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import { audit } from "./audit";
import { dbEnabled } from "@/lib/db";
import { CODE_RE, deletePromo, getPromo, normalizeCode, savePromo } from "@/lib/promo";

export type PromoFormState = { ok?: string; error?: string; values?: Record<string, string> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ru = (d: string) => d.split("-").reverse().join(".");

/** Create or edit a promo code from the admin form. */
export async function savePromoAction(_prev: PromoFormState | undefined, form: FormData): Promise<PromoFormState> {
  const me = await requireAdmin();
  if (!dbEnabled()) return { error: "Промокоды работают на боевом сервере." };
  const isNew = form.get("mode") !== "edit";
  const code = normalizeCode(String(form.get("code") ?? ""));
  const percent = Math.round(Number(form.get("percent")));
  const startsOn = String(form.get("startsOn") ?? "");
  const endsOn = String(form.get("endsOn") ?? "");
  const active = isNew ? true : form.get("active") === "on";
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  const values = { code, percent: String(form.get("percent") ?? ""), startsOn, endsOn, note };

  if (!CODE_RE.test(code)) return { values, error: "Название: от 3 до 30 латинских букв или цифр, без пробелов. Например, WINTER или SALE10." };
  if (!(percent >= 1 && percent <= 90)) return { values, error: "Скидка — от 1 до 90%." };
  if (!DATE_RE.test(startsOn) || !DATE_RE.test(endsOn)) return { values, error: "Выберите даты начала и окончания." };
  if (endsOn < startsOn) return { values, error: "Дата окончания раньше даты начала." };

  const before = isNew ? null : await getPromo(code);
  const res = await savePromo({ code, percent, startsOn, endsOn, active, note }, isNew);
  if (res === "exists") return { values, error: `Промокод ${code} уже есть. Придумайте другое название или измените существующий.` };

  if (isNew) {
    await audit("promo_created", { admin: me, target: code, label: code, details: [`Скидка: ${percent}%`, `Срок: ${ru(startsOn)} — ${ru(endsOn)}`] });
  } else if (before) {
    const changes: string[] = [];
    if (before.percent !== percent) changes.push(`Скидка: ${before.percent}% → ${percent}%`);
    if (before.startsOn !== startsOn || before.endsOn !== endsOn) changes.push(`Срок: ${ru(before.startsOn)} — ${ru(before.endsOn)} → ${ru(startsOn)} — ${ru(endsOn)}`);
    if (before.active !== active) changes.push(active ? "Включён" : "Выключен");
    if (before.note !== note) changes.push("Заметка изменена");
    if (changes.length) await audit("promo_updated", { admin: me, target: code, label: code, details: changes });
  }
  revalidatePath("/admin/promos");
  return { ok: isNew ? `Промокод ${code} создан.` : `Промокод ${code} сохранён.` };
}

export async function deletePromoAction(code: string): Promise<PromoFormState> {
  const me = await requireAdmin();
  const p = await getPromo(code);
  if (!p) return { error: "Не найден" };
  await deletePromo(p.code);
  await audit("promo_deleted", { admin: me, target: p.code, label: p.code, details: [`Скидка была ${p.percent}%`] });
  revalidatePath("/admin/promos");
  return { ok: `Промокод ${p.code} удалён.` };
}
