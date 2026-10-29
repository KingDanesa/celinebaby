import Link from "next/link";
import { Check } from "lucide-react";
import { getDictionary } from "@/i18n";
import { isLocale, type Locale } from "@/i18n/config";
import { Monogram } from "@/components/ui/Logo";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { locale } = await params;
  const { order } = await searchParams;
  const l: Locale = isLocale(locale) ? locale : "ru";
  const t = getDictionary(l);
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <div className="relative">
        <Monogram size={120} className="opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white">
            <Check className="h-6 w-6" />
          </span>
        </div>
      </div>
      <h1 className="mt-6 text-[32px] font-semibold sm:text-[40px]">{t.checkout.successTitle}</h1>
      <p className="mt-3 max-w-md text-muted">{t.checkout.successText}</p>
      {order && (
        <p className="mt-6 rounded-full bg-sand px-5 py-2 text-[14px]">
          {t.checkout.orderNumber}: <span className="font-semibold">{order}</span>
        </p>
      )}
      <p className="mt-6 text-[12px] text-muted/80">{t.checkout.demoNote}</p>
      <Link href={`/${l}`} className="btn-primary mt-8">
        {t.checkout.backHome}
      </Link>
    </div>
  );
}
