"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Check, Copy, KeyRound, Lock, Mail, Trash2, UserPlus } from "lucide-react";
import {
  changePasswordAction,
  inviteAction,
  loginAction,
  removeAdminAction,
  requestResetAction,
  resendInviteAction,
  resetPasswordAction,
  type FormState,
} from "@/lib/admin/access-actions";

function Field({ label, name, type = "text", autoComplete, defaultValue, hint, autoFocus }: { label: string; name: string; type?: string; autoComplete?: string; defaultValue?: string; hint?: string; autoFocus?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft">{label}</span>
      <input name={name} type={type} required autoComplete={autoComplete} defaultValue={defaultValue} autoFocus={autoFocus} className="input" />
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

function Messages({ state }: { state?: FormState }) {
  return (
    <>
      {state?.error && <p className="rounded-xl bg-rose-100 px-4 py-2 text-[13px] text-rose-800">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-mint px-4 py-2 text-[13px] text-ink">{state.ok}</p>}
      {state?.link && <CopyLink link={state.link} />}
    </>
  );
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-sand px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-[12px] text-ink-soft">{link}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(link).then(() => setCopied(true));
        }}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 text-[12px] font-medium hover:bg-pink-soft"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Скопировано" : "Копировать"}
      </button>
    </div>
  );
}

export function LoginForm({ accounts }: { accounts: boolean }) {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {accounts && <Field label="E-mail" name="email" type="email" autoComplete="username" defaultValue={state?.values?.email} autoFocus />}
      <Field label="Пароль" name="password" type="password" autoComplete="current-password" autoFocus={!accounts} />
      <Messages state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        <Lock className="h-4 w-4" /> Войти
      </button>
      {accounts && (
        <Link href="/admin/forgot" className="text-center text-[13px] text-muted hover:text-ink">
          Забыли пароль?
        </Link>
      )}
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestResetAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-[14px] text-ink-soft">Укажите e-mail, с которым вы входите в админку. Пришлём ссылку для нового пароля.</p>
      <Field label="E-mail" name="email" type="email" autoComplete="username" defaultValue={state?.values?.email} autoFocus />
      <Messages state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        <Mail className="h-4 w-4" /> Отправить ссылку
      </button>
      <Link href="/admin/login" className="text-center text-[13px] text-muted hover:text-ink">
        ← Ко входу
      </Link>
    </form>
  );
}

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="text" name="username" value={email} autoComplete="username" readOnly hidden />
      <p className="text-[14px] text-ink-soft">
        Новый пароль для <b>{email}</b>
      </p>
      <Field label="Новый пароль" name="password" type="password" autoComplete="new-password" hint="Не короче 10 символов" autoFocus />
      <Field label="Ещё раз" name="repeat" type="password" autoComplete="new-password" />
      <Messages state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        <KeyRound className="h-4 w-4" /> Сохранить и войти
      </button>
    </form>
  );
}

export function ChangePasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="text" name="username" value={email} autoComplete="username" readOnly hidden />
      <Field label="Текущий пароль" name="current" type="password" autoComplete="current-password" />
      <Field label="Новый пароль" name="password" type="password" autoComplete="new-password" hint="Не короче 10 символов" />
      <Field label="Новый пароль ещё раз" name="repeat" type="password" autoComplete="new-password" />
      <Messages state={state} />
      <button type="submit" disabled={pending} className="btn-primary self-start">
        <KeyRound className="h-4 w-4" /> Сменить пароль
      </button>
    </form>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Имя" name="name" defaultValue={state?.values?.name} />
        <Field label="E-mail" name="email" type="email" defaultValue={state?.values?.email} />
      </div>
      <Messages state={state} />
      <button type="submit" disabled={pending} className="btn-primary self-start">
        <UserPlus className="h-4 w-4" /> Добавить и отправить приглашение
      </button>
    </form>
  );
}

export function MemberActions({ id, email, pending: invited, isMe }: { id: string; email: string; pending: boolean; isMe: boolean }) {
  const [busy, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        {invited && (
          <button type="button" disabled={busy} onClick={() => start(async () => setState(await resendInviteAction(email)))} className="rounded-lg border border-line px-2.5 py-1 text-[12px] hover:border-ink">
            Отправить ссылку ещё раз
          </button>
        )}
        {!isMe && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirm(`Удалить доступ для ${email}?`)) start(async () => setState(await removeAdminAction(id)));
            }}
            className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[12px] text-rose-700 hover:border-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" /> Удалить
          </button>
        )}
      </div>
      {(state.error || state.ok || state.link) && (
        <div className="w-full max-w-md text-left">
          <Messages state={state} />
        </div>
      )}
    </div>
  );
}
