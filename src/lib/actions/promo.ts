"use server";

import { checkPromo } from "@/lib/promo";
import { clientIp, tooMany } from "@/lib/rate-limit";

export type PromoResult = { ok: true; code: string; percent: number } | { ok: false; error: string };

const MESSAGES = {
  ru: {
    unknown: "Такого промокода нет. Проверьте, как он написан.",
    scheduled: "Этот промокод ещё не начал действовать.",
    expired: "Срок действия промокода закончился.",
    off: "Этот промокод больше не действует.",
    unavailable: "Промокоды временно недоступны.",
    empty: "Введите промокод.",
    flood: "Слишком много попыток. Попробуйте через несколько минут.",
  },
  kk: {
    unknown: "Мұндай промокод жоқ. Жазылуын тексеріңіз.",
    scheduled: "Бұл промокод әлі күшіне енген жоқ.",
    expired: "Промокодтың мерзімі аяқталды.",
    off: "Бұл промокод енді жарамсыз.",
    unavailable: "Промокодтар уақытша қолжетімсіз.",
    empty: "Промокодты енгізіңіз.",
    flood: "Тым көп әрекет. Бірнеше минуттан кейін көріңіз.",
  },
};

/** "Применить промокод" in the cart and at checkout. */
export async function applyPromoAction(code: string, locale: string): Promise<PromoResult> {
  const m = MESSAGES[locale === "kk" ? "kk" : "ru"];
  if (!code.trim()) return { ok: false, error: m.empty };
  if (tooMany(`promo:${await clientIp()}`, 20, 600)) return { ok: false, error: m.flood };
  const res = await checkPromo(code.slice(0, 40));
  return res.ok ? res : { ok: false, error: m[res.reason] };
}

/** Re-check a code saved in the browser: it may have expired or changed its percent since. `null` = keep as is. */
export async function refreshPromoAction(code: string): Promise<{ code: string; percent: number } | false | null> {
  if (tooMany(`promo-refresh:${await clientIp()}`, 60, 600)) return null;
  const res = await checkPromo(code.slice(0, 40));
  if (res.ok) return { code: res.code, percent: res.percent };
  return res.reason === "unavailable" ? null : false;
}
