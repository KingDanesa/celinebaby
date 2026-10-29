import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { CheckoutForm } from "@/components/cart/CheckoutForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : "ru").checkout.title };
}

export default function Page() {
  return <CheckoutForm />;
}
