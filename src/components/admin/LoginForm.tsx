"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { loginAction } from "@/lib/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft">Пароль</span>
        <input name="password" type="password" autoFocus autoComplete="current-password" className="input" />
      </label>
      {state?.error && <p className="rounded-xl bg-rose-100 px-4 py-2 text-[13px] text-rose-800">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        <Lock className="h-4 w-4" /> Войти
      </button>
    </form>
  );
}
