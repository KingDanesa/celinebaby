import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { isLocale } from "@/i18n/config";
import { CheckoutForm } from "@/components/cart/CheckoutForm";
import { getCurrentUser } from "@/lib/auth/server";
import { halykEnabled } from "@/lib/payment/halyk";
import { kaspiOnlineEnabled } from "@/lib/payment/kaspi";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : "ru").checkout.title };
}

export default async function Page() {
  const user = await getCurrentUser();
  return <CheckoutForm user={user} online={{ halyk: halykEnabled(), kaspi: kaspiOnlineEnabled() }} />;
}
