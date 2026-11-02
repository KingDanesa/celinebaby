"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { submitRequestAction } from "@/lib/actions/requests";

export function ContactForm() {
  const { t, locale } = useI18n();
  const c = t.pages.contacts;
  const [state, action, pending] = useActionState(submitRequestAction, {});
  if (state?.ok) return <p className="mt-6 rounded-2xl bg-rose-50 px-5 py-4 text-[14px] text-rose-800">{c.sent}</p>;
  return (
    <form action={action} className="mt-6 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="kind" value="contact" />
      <input type="hidden" name="locale" value={locale} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <input required name="name" placeholder={c.name} autoComplete="name" className="input" />
      <input required name="phone" type="tel" placeholder={t.checkout.phone} autoComplete="tel" className="input" />
      <input name="email" type="email" placeholder={c.email} autoComplete="email" className="input sm:col-span-2" />
      <textarea required name="message" rows={5} placeholder={c.message} className="input resize-none sm:col-span-2" />
      {state?.error && <p className="rounded-xl bg-rose-100 px-4 py-2 text-[13px] text-rose-800 sm:col-span-2">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary sm:col-span-2 sm:w-fit">
        {pending ? "…" : c.send}
      </button>
    </form>
  );
}
