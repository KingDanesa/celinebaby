"use server";

import { markEmailed, saveRequest, type RequestKind } from "@/lib/requests";
import { sendRequestEmail } from "@/lib/email";
import { clientIp, tooMany } from "@/lib/rate-limit";

export type RequestState = { ok?: boolean; error?: string };

const clip = (v: FormDataEntryValue | null, n: number) => String(v ?? "").trim().slice(0, n);

/** "Напишите нам" and gift certificate forms. */
export async function submitRequestAction(_prev: RequestState | undefined, form: FormData): Promise<RequestState> {
  const kind: RequestKind = form.get("kind") === "gift" ? "gift" : "contact";
  const locale = form.get("locale") === "kk" ? "kk" : "ru";
  const err = (ru: string, kk: string) => ({ error: locale === "kk" ? kk : ru });

  // Bots fill every field, people never see this one.
  if (clip(form.get("website"), 200)) return { ok: true };
  if (tooMany(`req:${await clientIp()}`, 8, 3600)) return err("Слишком много заявок подряд. Попробуйте позже или напишите в WhatsApp.", "Тым көп өтінім. Кейінірек көріңіз немесе WhatsApp-қа жазыңыз.");

  const name = clip(form.get("name"), 120);
  const phone = clip(form.get("phone"), 40);
  const email = clip(form.get("email"), 120);
  if (name.length < 2) return err("Укажите имя", "Атыңызды енгізіңіз");
  if (phone.replace(/\D/g, "").length < 10) return err("Проверьте телефон", "Телефонды тексеріңіз");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("Проверьте e-mail", "E-mail дұрыс емес");

  const data = {
    name,
    phone,
    email: email || undefined,
    message: clip(form.get("message"), 3000) || undefined,
    locale,
    ...(kind === "gift"
      ? {
          amount: Math.max(0, Math.min(10_000_000, Number(form.get("amount")) || 0)),
          format: clip(form.get("format"), 40),
          recipient: clip(form.get("recipient"), 120) || undefined,
          recipientEmail: clip(form.get("recipientEmail"), 120) || undefined,
        }
      : {}),
  };
  if (kind === "contact" && !data.message) return err("Напишите сообщение", "Хабарлама жазыңыз");

  let id: number | null = null;
  try {
    id = await saveRequest(kind, data);
  } catch (e) {
    console.error("[requests] save failed", e);
  }
  const emailed = await sendRequestEmail(kind, data, id).catch(() => false);
  if (id && emailed) await markEmailed(id).catch(() => {});
  if (!id && !emailed) return err("Не удалось отправить. Попробуйте ещё раз или напишите нам в WhatsApp.", "Жіберу мүмкін болмады. WhatsApp-қа жазыңыз.");
  return { ok: true };
}
