import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { Wordmark, Monogram } from "@/components/ui/Logo";

export function Footer({ t, locale }: { t: Dictionary; locale: Locale }) {
  const href = (p: string) => `/${locale}${p}`;
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-20 overflow-hidden border-t border-line bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70 watercolor-fade">
        <Image src="/brand/pattern-balloons.jpg" alt="" fill sizes="100vw" className="object-cover object-top" />
      </div>

      <div className="container-x relative">
        <div className="grid gap-10 py-14 md:grid-cols-12 md:py-20">
          <div className="md:col-span-4">
            <Wordmark width={160} />
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-muted">{t.footer.tagline}</p>
            <div className="mt-6 flex items-center gap-3">
              <Social href="https://www.instagram.com/celinebaby__kz" label="Instagram">
                <Instagram className="h-[18px] w-[18px]" />
              </Social>
              <Social href="https://www.tiktok.com/@celinebaby__kz" label="TikTok">
                <TikTok />
              </Social>
              <Social href="https://wa.me/77018159663" label="WhatsApp">
                <WhatsApp />
              </Social>
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow mb-4">{t.footer.shop}</p>
            <ul className="flex flex-col gap-2.5 text-[14px] text-ink-soft">
              <li><Link className="hover:text-rose-700" href={href("/delivery")}>{t.footer.delivery}</Link></li>
              <li><Link className="hover:text-rose-700" href={href("/delivery#payment")}>{t.footer.payment}</Link></li>
              <li><Link className="hover:text-rose-700" href={href("/delivery#returns")}>{t.footer.returns}</Link></li>
              <li><Link className="hover:text-rose-700" href={href("/sizes")}>{t.footer.sizes}</Link></li>
              <li><Link className="hover:text-rose-700" href={href("/gift-cards")}>{t.footer.giftCards}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow mb-4">{t.footer.company}</p>
            <ul className="flex flex-col gap-2.5 text-[14px] text-ink-soft">
              <li><Link className="hover:text-rose-700" href={href("/about")}>{t.footer.about}</Link></li>
              <li><Link className="hover:text-rose-700" href={href("/blog")}>{t.footer.blog}</Link></li>
              <li><Link className="hover:text-rose-700" href={href("/contacts")}>{t.footer.contacts}</Link></li>
              <li><Link className="hover:text-rose-700" href={href("/offer")}>{t.footer.offer}</Link></li>
              <li><Link className="hover:text-rose-700" href={href("/privacy")}>{t.footer.privacy}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="eyebrow mb-4">{t.footer.contactsTitle}</p>
            <ul className="flex flex-col gap-3 text-[14px] text-ink-soft">
              <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />{t.footer.address}</li>
              <li className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />{t.footer.hours}</li>
              <li className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><a href="tel:+77018159663" className="hover:text-rose-700">+7 (701) 815 96 63</a></li>
              <li className="flex items-start gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><a href="mailto:celinebabykazakhstan@gmail.com" className="hover:text-rose-700">celinebabykazakhstan@gmail.com</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-line py-6 text-[12px] text-muted sm:flex-row">
          <p>© {year} Celine Baby. {t.footer.rights}</p>
          <Monogram size={28} className="opacity-60" />
        </div>
      </div>
    </footer>
  );
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-rose-600 hover:bg-rose-50 hover:text-rose-700"
    >
      {children}
    </a>
  );
}

function Instagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function TikTok() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="currentColor" aria-hidden>
      <path d="M16.5 3c.3 2.3 1.7 3.8 4 4v3.1c-1.5 0-2.9-.5-4-1.3v6.3c0 3.3-2.7 5.9-6 5.9S4.5 18.4 4.5 15.1s2.7-5.9 6-5.9c.4 0 .7 0 1 .1v3.2a2.8 2.8 0 1 0 2 2.7V3h3z" />
    </svg>
  );
}

function WhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 2.9 4.5 4 1.7.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3z" />
    </svg>
  );
}
