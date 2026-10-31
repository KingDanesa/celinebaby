import Link from "next/link";
import Image from "next/image";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { STORE } from "@/data/categories";

export function Footer({ t, locale }: { t: Dictionary; locale: Locale }) {
  const href = (p: string) => `/${locale}${p}`;
  const year = new Date().getFullYear();
  const col = "flex flex-col gap-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink";
  return (
    <footer className="mt-20 bg-pink text-ink">
      <div className="container-x">
        <div className="grid gap-10 py-12 md:grid-cols-12 md:py-16">
          <div className="md:col-span-4">
            <Image src="/brand/wordmark.svg" alt="Celine Baby" width={170} height={29} unoptimized className="h-auto" />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-ink-soft">{t.footer.tagline}</p>
            <a href={STORE.whatsapp} target="_blank" rel="noreferrer" className="btn-dark mt-6 px-5 py-2.5 text-[11px]">
              {t.footer.whatsapp}
            </a>
          </div>
          <div className="md:col-span-3">
            <ul className={col}>
              <li><Link className="link-underline" href={href("/delivery")}>{t.footer.delivery}</Link></li>
              <li><Link className="link-underline" href={href("/sizes")}>{t.footer.sizes}</Link></li>
              <li><Link className="link-underline" href={href("/delivery#returns")}>{t.footer.returns}</Link></li>
              <li><Link className="link-underline" href={href("/gift-cards")}>{t.footer.giftCards}</Link></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <ul className={col}>
              <li><Link className="link-underline" href={href("/about")}>{t.footer.about}</Link></li>
              <li><Link className="link-underline" href={href("/blog")}>{t.footer.blog}</Link></li>
              <li><Link className="link-underline" href={href("/contacts")}>{t.footer.contacts}</Link></li>
              <li><Link className="link-underline" href={href("/account")}>{t.nav.account}</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <ul className="flex flex-col gap-2 text-[13.5px] text-ink-soft">
              <li>{t.footer.address}</li>
              <li>{t.footer.hours}</li>
              <li><a href={`tel:+${STORE.phoneRaw}`} className="hover:text-rose-800">{STORE.phone}</a></li>
              <li><a href={STORE.instagram} target="_blank" rel="noreferrer" className="hover:text-rose-800">Instagram @celinebaby__kz</a></li>
              <li><a href={`mailto:${STORE.email}`} className="hover:text-rose-800">{STORE.email}</a></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 border-t border-rose-300/60 py-5 text-[11px] text-ink-soft sm:flex-row sm:items-center">
          <p>© {year} Celine Baby. {t.footer.rights}</p>
          <div className="flex gap-5">
            <Link href={href("/offer")} className="hover:text-rose-800">{t.footer.offer}</Link>
            <Link href={href("/privacy")} className="hover:text-rose-800">{t.footer.privacy}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
