export function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
    .format(value)
    .replace(/ /g, " ") + " ₸";
}

export function imageUrl(src: string): string {
  // Source URLs may contain spaces and Cyrillic characters.
  if (/%[0-9A-Fa-f]{2}/.test(src)) return src;
  return encodeURI(src);
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
