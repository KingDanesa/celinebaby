import type { Metadata } from "next";
import { Comfortaa, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import "../../globals.css";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { CartProvider } from "@/components/providers/CartProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { getMenuData } from "@/lib/menu";
import { loadProducts } from "@/lib/products";
import { getCurrentUser } from "@/lib/auth/server";

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(isLocale(locale) ? locale : "ru");
  return {
    title: { default: dict.meta.title, template: "%s — Celine Baby" },
    description: dict.meta.description,
    icons: { icon: "/brand/monogram.svg" },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale as Locale);
  const [products, user] = await Promise.all([loadProducts(), getCurrentUser()]);
  const menu = getMenuData(products);

  return (
    <html lang={locale} className={`${comfortaa.variable} ${manrope.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={locale as Locale} dict={dict}>
          <CartProvider>
            <Header menu={menu} userName={user?.name ?? null} />
            <main className="flex-1">{children}</main>
            <Footer t={dict} locale={locale as Locale} />
            <CartDrawer />
          </CartProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
