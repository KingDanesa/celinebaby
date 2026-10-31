"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { changePasswordAction, loginAction, registerAction, requestResetAction, resetPasswordAction, updateProfileAction, type AuthResult } from "@/lib/auth/actions";
import type { SiteUser } from "@/lib/types";

function Field({ label, name, type = "text", required, autoComplete, defaultValue, hint, placeholder }: { label: string; name: string; type?: string; required?: boolean; autoComplete?: string; defaultValue?: string; hint?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft">
        {label} {required && <span className="text-rose-600">*</span>}
      </span>
      <input name={name} type={type} required={required} autoComplete={autoComplete} defaultValue={defaultValue} placeholder={placeholder} className="input" />
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

function ErrorBox({ state }: { state?: AuthResult }) {
  if (!state?.error) return null;
  return <p className="rounded-xl bg-rose-100 px-4 py-2 text-[13px] text-rose-800">{state.error}</p>;
}

export function LoginForm({ next }: { next?: string }) {
  const { t, locale, href } = useI18n();
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t.account.email} name="email" type="email" required autoComplete="email" />
      <Field label={t.account.password} name="password" type="password" required autoComplete="current-password" />
      <ErrorBox state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {t.account.loginBtn}
      </button>
      <div className="flex justify-between text-[13px] text-muted">
        <Link href={href("/account/forgot")} className="hover:text-ink">
          {t.account.forgot}
        </Link>
        <Link href={href(`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`)} className="font-semibold text-rose-700 hover:text-rose-800">
          {t.account.noAccount} {t.account.register}
        </Link>
      </div>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const { t, locale, href } = useI18n();
  const [state, action, pending] = useActionState(registerAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t.account.name} name="name" required autoComplete="name" />
      <Field label={t.account.phone} name="phone" type="tel" required autoComplete="tel" placeholder="+7 (___) ___ __ __" />
      <Field label={t.account.email} name="email" type="email" required autoComplete="email" />
      <Field label={t.account.password} name="password" type="password" required autoComplete="new-password" hint={t.account.passwordHint} />
      <ErrorBox state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {t.account.registerBtn}
      </button>
      <p className="text-center text-[13px] text-muted">
        {t.account.haveAccount}{" "}
        <Link href={href(`/account/login${next ? `?next=${encodeURIComponent(next)}` : ""}`)} className="font-semibold text-rose-700 hover:text-rose-800">
          {t.account.loginBtn}
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(requestResetAction, {});
  if (state?.ok) return <p className="rounded-xl bg-mint px-4 py-3 text-[14px] text-ink-soft">{t.account.forgotSent}</p>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t.account.email} name="email" type="email" required autoComplete="email" />
      <ErrorBox state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {t.account.sendLink}
      </button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />
      <Field label={t.account.passwordNew} name="password" type="password" required autoComplete="new-password" hint={t.account.passwordHint} />
      <ErrorBox state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {t.account.resetBtn}
      </button>
    </form>
  );
}

export function ProfileForm({ user }: { user: SiteUser }) {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(updateProfileAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t.account.name} name="name" required defaultValue={user.name} autoComplete="name" />
      <Field label={t.account.phone} name="phone" type="tel" required defaultValue={user.phone} autoComplete="tel" />
      <Field label={t.account.city} name="city" defaultValue={user.city} autoComplete="address-level2" />
      <Field label={t.account.address} name="address" defaultValue={user.address} autoComplete="street-address" />
      <div className="sm:col-span-2">
        <ErrorBox state={state} />
      </div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {t.account.save}
        </button>
        {state?.ok && <span className="text-[13px] text-rose-700">{t.account.profileSaved}</span>}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { t, locale } = useI18n();
  const [state, action, pending] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t.account.passwordCurrent} name="current" type="password" required autoComplete="current-password" />
      <Field label={t.account.passwordNew} name="password" type="password" required autoComplete="new-password" hint={t.account.passwordHint} />
      <div className="sm:col-span-2">
        <ErrorBox state={state} />
      </div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-outline">
          {t.account.changePassword}
        </button>
        {state?.ok && <span className="text-[13px] text-rose-700">{t.account.passwordChanged}</span>}
      </div>
    </form>
  );
}
