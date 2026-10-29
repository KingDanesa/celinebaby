"use client";

import { useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

export function ContactForm() {
  const { t } = useI18n();
  const c = t.pages.contacts;
  const [sent, setSent] = useState(false);
  if (sent) return <p className="mt-6 rounded-2xl bg-rose-50 px-5 py-4 text-[14px] text-rose-800">{c.sent}</p>;
  return (
    <form
      className="mt-6 grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <input required name="name" placeholder={c.name} className="input" />
      <input required name="phone" type="tel" placeholder={t.checkout.phone} className="input" />
      <input name="email" type="email" placeholder={c.email} className="input sm:col-span-2" />
      <textarea required name="message" rows={5} placeholder={c.message} className="input resize-none sm:col-span-2" />
      <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">
        {c.send}
      </button>
    </form>
  );
}
