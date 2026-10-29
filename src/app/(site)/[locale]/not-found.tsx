"use client";

import Link from "next/link";
import { useI18n } from "@/components/providers/I18nProvider";
import { Monogram } from "@/components/ui/Logo";

export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <div className="container-x flex flex-col items-center py-28 text-center">
      <Monogram size={120} className="opacity-30" />
      <h1 className="mt-6 text-[32px] font-semibold">{t.pages.notFound.title}</h1>
      <p className="mt-2 text-muted">{t.pages.notFound.text}</p>
      <Link href={href("/")} className="btn-primary mt-8">
        {t.pages.notFound.cta}
      </Link>
    </div>
  );
}
