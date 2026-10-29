import ru from "./ru";
import kk from "./kk";
import type { Dictionary } from "./ru";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { ru, kk };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? ru;
}

export type { Dictionary };
