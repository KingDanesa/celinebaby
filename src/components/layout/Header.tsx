"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Heart, Menu, Phone, Search, ShoppingBag, X } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useCart } from "@/components/providers/CartProvider";
import { Wordmark } from "@/components/ui/Logo";
import { cn, imageUrl } from "@/lib/format";
import type { MenuData } from "@/lib/menu";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function Header({ menu }: { menu: MenuData }) {
  const { t, href, locale } = useI18n();
  const { count, wishlist, open, hydrated } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close any open panel when the route changes (state adjusted during render, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMega(false);
    setMobile(false);
    setSearch(false);
  }

  useEffect(() => {
    document.body.style.overflow = mobile || search ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile, search]);

  const openMega = () => setMega(true);
  const closeMega = () => setMega(false);

  const switchLocale = (l: Locale) => {
    // eslint-disable-next-line react-hooks/immutability -- writing a browser cookie, not React state
    document.cookie = `locale=${l}; path=/; max-age=31536000`;
    const rest = pathname.replace(/^\/(ru|kk)(?=\/|$)/, "");
    router.push(`/${l}${rest || ""}`);
  };

  const nav = [
    { label: t.nav.new, to: "/catalog/new" },
    { label: t.nav.girls, to: "/catalog/girls" },
    { label: t.nav.boys, to: "/catalog/boys" },
    { label: t.nav.discharge, to: "/catalog/nabory-na-vypisku" },
    { label: t.nav.blog, to: "/blog", secondary: true },
    { label: t.nav.about, to: "/about", secondary: true },
  ];

  const wishCount = hydrated ? wishlist.length : 0;
  const cartCount = hydrated ? count : 0;

  return (
    <>
      <div className="bg-rose-600 text-white">
        <div className="container-x flex h-9 items-center justify-center text-center text-[11px] font-medium tracking-wide sm:text-xs">
          {t.announcement}
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-all duration-300",
          scrolled || mega ? "border-line bg-white/95 backdrop-blur" : "border-transparent bg-cream",
        )}
        onMouseLeave={closeMega}
      >
        <div className="container-x flex h-[68px] items-center justify-between gap-6 lg:h-[76px]">
          <div className="flex items-center gap-3 lg:hidden">
            <button type="button" aria-label={t.nav.menu} onClick={() => setMobile(true)} className="-ml-2 p-2">
              <Menu className="h-6 w-6" />
            </button>
            <button type="button" aria-label={t.nav.search} onClick={() => setSearch(true)} className="p-2">
              <Search className="h-[22px] w-[22px]" />
            </button>
          </div>

          <Link href={href("/")} aria-label="Celine Baby" className="shrink-0">
            <Wordmark width={148} />
          </Link>

          <nav className="hidden items-center gap-5 whitespace-nowrap lg:flex xl:gap-7" aria-label="Main">
            <div onMouseEnter={openMega} className="relative">
              <button
                type="button"
                onClick={(e) => {
                  // Hover already opened the panel on desktop; a toggle is only useful for touch.
                  const touch = "pointerType" in e.nativeEvent && (e.nativeEvent as PointerEvent).pointerType === "touch";
                  setMega((v) => (touch ? !v : true));
                }}
                aria-expanded={mega}
                className={cn(
                  "flex items-center gap-1 py-6 text-[12.5px] font-semibold uppercase tracking-[0.08em] transition xl:text-[13.5px]",
                  mega ? "text-rose-700" : "text-ink hover:text-rose-700",
                )}
              >
                {t.nav.catalog}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mega && "rotate-180")} />
              </button>
            </div>
            {nav.map((n) => (
              <Link
                key={n.to}
                href={href(n.to)}
                onMouseEnter={closeMega}
                className={cn(
                  "link-underline py-6 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink transition hover:text-rose-700 xl:text-[13.5px]",
                  n.secondary && "hidden xl:inline-block",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="mr-1 hidden items-center gap-1 text-[12px] font-semibold uppercase tracking-wider sm:flex xl:mr-2">
              {locales.map((l, i) => (
                <span key={l} className="flex items-center">
                  {i > 0 && <span className="mx-1 text-line">/</span>}
                  <button
                    type="button"
                    onClick={() => switchLocale(l)}
                    className={cn("transition", l === locale ? "text-ink" : "text-muted hover:text-rose-700")}
                  >
                    {localeNames[l]}
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              aria-label={t.nav.search}
              onClick={() => setSearch(true)}
              className="hidden rounded-full p-2 transition hover:bg-sand lg:block"
            >
              <Search className="h-[21px] w-[21px]" />
            </button>
            <Link href={href("/wishlist")} aria-label={t.nav.wishlist} className="relative rounded-full p-2 transition hover:bg-sand">
              <Heart className="h-[21px] w-[21px]" />
              {wishCount > 0 && <Badge>{wishCount}</Badge>}
            </Link>
            <button type="button" aria-label={t.nav.cart} onClick={open} className="relative rounded-full p-2 transition hover:bg-sand">
              <ShoppingBag className="h-[21px] w-[21px]" />
              {cartCount > 0 && <Badge>{cartCount}</Badge>}
            </button>
          </div>
        </div>

        {/* Mega menu */}
        <div
          onMouseEnter={openMega}
          className={cn(
            "absolute inset-x-0 top-full hidden border-b border-line bg-white shadow-[0_24px_48px_-24px_rgba(43,14,20,0.25)] transition-all duration-300 lg:block",
            mega ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
          )}
        >
          <div className="container-x grid grid-cols-12 gap-8 py-9">
            <div className="col-span-3 flex flex-col gap-3">
              <p className="eyebrow">{t.nav.byAge}</p>
              <AgeTile
                href={href("/catalog/newborn")}
                image={menu.ageImages.newborn}
                title={t.nav.newborn}
                hint={t.nav.newbornHint}
              />
              <AgeTile href={href("/catalog/toddler")} image={menu.ageImages.toddler} title={t.nav.toddler} hint={t.nav.toddlerHint} />
            </div>
            <div className="col-span-4">
              <p className="eyebrow mb-3">{t.nav.byType}</p>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
                {menu.categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={href(`/catalog/${c.slug}`)}
                      className="group flex items-center justify-between py-1 text-[14px] text-ink-soft transition hover:text-rose-700"
                    >
                      <span className="link-underline">{t.categories[c.slug]}</span>
                      <span className="text-[11px] text-muted/70 tabular-nums">{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={href("/catalog")}
                className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-rose-700 hover:text-rose-800"
              >
                {t.nav.allCatalog} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="col-span-2">
              <p className="eyebrow mb-3">{t.nav.special}</p>
              <ul className="flex flex-col gap-2 text-[14px] text-ink-soft">
                {[
                  { label: t.nav.new, to: "/catalog/new" },
                  { label: t.nav.hits, to: "/catalog/hits" },
                  { label: t.nav.discharge, to: "/catalog/nabory-na-vypisku" },
                  { label: t.nav.giftCards, to: "/gift-cards" },
                ].map((l) => (
                  <li key={l.to}>
                    <Link href={href(l.to)} className="link-underline transition hover:text-rose-700">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-3 grid grid-cols-2 gap-3">
              <GenderTile href={href("/catalog/girls")} image={menu.genderImages.girl} title={t.nav.girls} />
              <GenderTile href={href("/catalog/boys")} image={menu.genderImages.boy} title={t.nav.boys} />
            </div>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {search && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={() => setSearch(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const q = (new FormData(e.currentTarget).get("q") as string).trim();
              setSearch(false);
              router.push(href(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog"));
            }}
            className="container-x mt-24 w-full max-w-2xl animate-fade-up"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-white p-2 pl-5 shadow-xl">
              <Search className="h-5 w-5 text-muted" />
              <input
                autoFocus
                name="q"
                placeholder={t.nav.searchPlaceholder}
                className="h-12 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
              />
              <button type="submit" className="btn-primary h-11 px-5">
                {t.nav.search}
              </button>
              <button type="button" aria-label={t.nav.close} onClick={() => setSearch(false)} className="p-2 text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={() => setMobile(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl animate-slide-in-left">
            <div className="flex h-[68px] items-center justify-between border-b border-line px-4">
              <Wordmark width={130} />
              <button type="button" aria-label={t.nav.close} onClick={() => setMobile(false)} className="-mr-2 p-2">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <AgeTile href={href("/catalog/newborn")} image={menu.ageImages.newborn} title={t.nav.newborn} hint={t.nav.newbornHint} compact />
                <AgeTile href={href("/catalog/toddler")} image={menu.ageImages.toddler} title={t.nav.toddler} hint={t.nav.toddlerHint} compact />
              </div>
              <ul className="mt-5 divide-y divide-line text-[15px] font-semibold">
                {[{ label: t.nav.new, to: "/catalog/new" }, { label: t.nav.girls, to: "/catalog/girls" }, { label: t.nav.boys, to: "/catalog/boys" }].map((n) => (
                  <li key={n.to}>
                    <Link href={href(n.to)} className="flex items-center justify-between py-3.5">
                      {n.label} <ChevronRight className="h-4 w-4 text-muted" />
                    </Link>
                  </li>
                ))}
                <li>
                  <MobileAccordion title={t.nav.byType}>
                    <ul className="grid grid-cols-1 gap-1 pb-3 text-[14px] font-normal text-ink-soft">
                      {menu.categories.map((c) => (
                        <li key={c.slug}>
                          <Link href={href(`/catalog/${c.slug}`)} className="flex justify-between py-1.5">
                            {t.categories[c.slug]} <span className="text-muted/70 tabular-nums">{c.count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </MobileAccordion>
                </li>
                {[{ label: t.nav.giftCards, to: "/gift-cards" }, { label: t.nav.blog, to: "/blog" }, { label: t.nav.about, to: "/about" }, { label: t.footer.contacts, to: "/contacts" }].map((n) => (
                  <li key={n.to}>
                    <Link href={href(n.to)} className="flex items-center justify-between py-3.5">
                      {n.label} <ChevronRight className="h-4 w-4 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-line px-4 py-4">
              <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider">
                {locales.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => switchLocale(l)}
                    className={cn("rounded-full border px-3 py-1.5", l === locale ? "border-ink bg-ink text-white" : "border-line text-muted")}
                  >
                    {localeNames[l]}
                  </button>
                ))}
              </div>
              <a href="tel:+77018159663" className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <Phone className="h-4 w-4 text-rose-600" /> +7 (701) 815 96 63
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
      {children}
    </span>
  );
}

function AgeTile({ href, image, title, hint, compact }: { href: string; image: string; title: string; hint: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group relative block overflow-hidden rounded-2xl bg-sand", compact ? "aspect-[4/5]" : "aspect-[16/9]")}>
      {image && (
        <Image
          src={imageUrl(image)}
          alt=""
          fill
          sizes="320px"
          className="object-cover transition-transform duration-700 ease-soft group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
        <p className="font-display text-[15px] font-semibold leading-tight">{title}</p>
        <p className="text-[11px] opacity-85">{hint}</p>
      </div>
    </Link>
  );
}

function GenderTile({ href, image, title }: { href: string; image: string; title: string }) {
  return (
    <Link href={href} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-sand">
      {image && (
        <Image src={imageUrl(image)} alt="" fill sizes="200px" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
      <p className="absolute inset-x-0 bottom-0 p-3.5 font-display text-[15px] font-semibold text-white">{title}</p>
    </Link>
  );
}

function MobileAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [openAcc, setOpenAcc] = useState(true);
  return (
    <div>
      <button type="button" onClick={() => setOpenAcc((v) => !v)} className="flex w-full items-center justify-between py-3.5">
        {title} <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", openAcc && "rotate-180")} />
      </button>
      {openAcc && children}
    </div>
  );
}
