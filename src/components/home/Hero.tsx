import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/i18n";

export function Hero({ t, href }: { t: Dictionary; href: (p: string) => string }) {
  return (
    <section className="container-x pt-3 sm:pt-5">
      <div className="relative overflow-hidden rounded-[28px] bg-sand sm:rounded-[36px]">
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[21/9] lg:max-h-[680px]">
          <Image
            src="/img/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[70%_30%] sm:object-[center_30%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/10 sm:bg-gradient-to-r sm:from-ink/65 sm:via-ink/30 sm:to-transparent" />
        </div>
        <div className="absolute inset-0 flex items-end p-6 sm:items-center sm:p-12 lg:p-16">
          <div className="max-w-xl text-white animate-fade-up [text-shadow:0_2px_24px_rgba(43,14,20,0.35)]">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85 sm:text-xs">{t.home.heroEyebrow}</p>
            <h1 className="text-[30px] leading-[1.05] font-semibold sm:text-[48px] lg:text-[60px]">{t.home.heroTitle}</h1>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/90 sm:mt-4 sm:text-base">{t.home.heroSubtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={href("/catalog")} className="btn bg-white text-ink hover:bg-rose-50">
                {t.home.heroCta}
              </Link>
              <Link href={href("/catalog/nabory-na-vypisku")} className="btn border border-white/60 text-white backdrop-blur-sm hover:bg-white/15">
                {t.home.heroCta2}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
