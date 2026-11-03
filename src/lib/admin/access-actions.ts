"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, adminAccountsEnabled, adminCookie, checkPassword, createSessionValue, currentAdmin, requireAdmin } from "./auth";
import { audit } from "./audit";
import { sendAdminLinkEmail } from "@/lib/email";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

export type FormState = { error?: string; ok?: string; link?: string; values?: Record<string, string> };

const slow = () => new Promise((r) => setTimeout(r, 400));
const OWNER_ONLY = "Добавлять и удалять сотрудников может только владелец аккаунта.";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const pwError = (pw: string) => (pw.length < 10 ? "Пароль не короче 10 символов" : pw.length > 200 ? "Слишком длинный пароль" : null);

async function setSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, adminCookie(60 * 60 * 24 * 14));
}

/* ---------------- sign in / out ---------------- */

export async function loginAction(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const ip = await clientIp();
  if (tooMany(`admin:${ip}`, 10, 900) || (email && tooMany(`admin:${email}`, 8, 900))) {
    await slow();
    return { values: { email }, error: "Слишком много попыток. Подождите 15 минут или восстановите пароль." };
  }

  if (!adminAccountsEnabled()) {
    if (!checkPassword(password)) {
      await slow();
      return { error: "Неверный пароль" };
    }
    await setSession(await createSessionValue());
    redirect("/admin");
  }

  const users = await import("./users");
  if (!EMAIL_RE.test(email)) return { values: { email }, error: "Укажите e-mail" };
  const token = (await users.signInAdmin(email, password)) ?? (await users.bootstrapFirstAdmin(email, password));
  if (!token) {
    await audit("login_failed", { email });
    await slow();
    return { values: { email }, error: "Неверный e-mail или пароль" };
  }
  await setSession(token);
  const me = await users.adminFromSession(token);
  await audit("login", { admin: me, email });
  redirect("/admin");
}

export async function logoutAction() {
  await audit("logout", { admin: await currentAdmin() });
  const jar = await cookies();
  if (adminAccountsEnabled()) {
    const { signOutAdmin } = await import("./users");
    await signOutAdmin(jar.get(SESSION_COOKIE)?.value).catch(() => {});
  }
  jar.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* ---------------- forgotten password ---------------- */

export async function requestResetAction(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { values: { email }, error: "Укажите e-mail" };
  if (adminAccountsEnabled() && !tooMany(`admin-reset:${email}`, 3, 3600) && !tooMany(`admin-reset-ip:${await clientIp()}`, 10, 3600)) {
    const { createAdminReset } = await import("./users");
    const reset = await createAdminReset(email);
    if (reset) await sendAdminLinkEmail(email, `${siteUrl()}/admin/reset?token=${encodeURIComponent(reset.token)}`, "reset", reset.name);
  }
  // Same answer either way: it must not reveal who is an admin.
  return { ok: "Если такой e-mail есть в админке, на него отправлена ссылка для нового пароля. Она действует 1 час." };
}

export async function resetPasswordAction(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  const bad = pwError(password);
  if (bad) return { error: bad };
  if (password !== repeat) return { error: "Пароли не совпадают" };
  const { adminForResetToken, resetAdminPassword } = await import("./users");
  const who = await adminForResetToken(token);
  const session = await resetAdminPassword(token, password);
  if (!session) return { error: "Ссылка недействительна или устарела. Запросите новую." };
  await setSession(session);
  await audit("password_reset", { admin: who, details: [who?.pending ? "Сотрудник принял приглашение и задал пароль" : "Пароль задан по ссылке из письма"] });
  redirect("/admin?welcome=1");
}

/* ---------------- my password ---------------- */

export async function changePasswordAction(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  if (!adminAccountsEnabled()) return { error: "На демо-версии пароль меняется только в настройках сервера." };
  const current = String(formData.get("current") ?? "").slice(0, 200);
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  const bad = pwError(password);
  if (bad) return { error: bad };
  if (password !== repeat) return { error: "Новые пароли не совпадают" };
  if (tooMany(`admin-pw:${me.id}`, 8, 900)) return { error: "Слишком много попыток, попробуйте позже" };
  const { changeAdminPassword } = await import("./users");
  const res = await changeAdminPassword(me.id, current, password);
  if (res === "wrong") {
    await slow();
    return { error: "Текущий пароль неверный" };
  }
  await setSession(res);
  await audit("password_changed", { admin: me });
  return { ok: "Пароль изменён. На других устройствах нужно войти заново." };
}

/* ---------------- team ---------------- */

export async function inviteAction(_prev: FormState | undefined, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();
  if (me.role !== "owner") return { error: OWNER_ONLY };
  if (!adminAccountsEnabled()) return { error: "Доступно только на боевом сервере." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!EMAIL_RE.test(email)) return { values: { email, name }, error: "Проверьте e-mail" };
  const { inviteAdmin } = await import("./users");
  const res = await inviteAdmin(email, name);
  if (res === "exists") return { values: { email, name }, error: "Этот e-mail уже есть в админке" };
  const link = `${siteUrl()}/admin/reset?token=${encodeURIComponent(res.token)}`;
  const sent = await sendAdminLinkEmail(email, link, "invite", name);
  await audit("staff_invited", { admin: me, target: email, label: name || email });
  revalidatePath("/admin/access");
  return {
    ok: sent ? `Приглашение отправлено на ${email}. Ссылка действует 3 дня.` : `Письмо не ушло (почта не настроена). Отправьте ссылку сотруднику сами, она действует 3 дня:`,
    link: sent ? undefined : link,
  };
}

export async function resendInviteAction(email: string): Promise<FormState> {
  const me = await requireAdmin();
  if (me.role !== "owner") return { error: OWNER_ONLY };
  const { createAdminReset } = await import("./users");
  const reset = await createAdminReset(email);
  if (!reset) return { error: "Не найден" };
  const link = `${siteUrl()}/admin/reset?token=${encodeURIComponent(reset.token)}`;
  const sent = await sendAdminLinkEmail(email, link, "invite", reset.name);
  await audit("invite_resent", { admin: me, target: email, label: reset.name || email });
  return sent ? { ok: `Ссылка отправлена на ${email}` } : { ok: "Почта не настроена. Отправьте ссылку сами:", link };
}

export async function removeAdminAction(id: string): Promise<FormState> {
  const me = await requireAdmin();
  if (me.role !== "owner") return { error: OWNER_ONLY };
  if (id === me.id) return { error: "Нельзя удалить самого себя" };
  const { countAdmins, getAdmin, removeAdmin } = await import("./users");
  const target = await getAdmin(id);
  if (!target) return { error: "Не найден" };
  if (target.role === "owner") return { error: "Аккаунт владельца удалить нельзя" };
  if ((await countAdmins()) <= 1) return { error: "В админке должен остаться хотя бы один человек" };
  await removeAdmin(id);
  await audit("staff_removed", { admin: me, target: target.email, label: target.name || target.email });
  revalidatePath("/admin/access");
  return { ok: "Доступ удалён" };
}
