"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, REFRESH_COOKIE, authClient, authEnabled, cookieOptions, getCurrentUser } from "./server";
import { sendPasswordResetEmail } from "@/lib/email";

export type AuthResult = { error?: string };

const ACCESS_TTL = 60 * 60; // Supabase default: 1 hour
const REFRESH_TTL = 60 * 60 * 24 * 30;

async function setSession(access: string, refresh: string) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, access, cookieOptions(ACCESS_TTL));
  jar.set(REFRESH_COOKIE, refresh, cookieOptions(REFRESH_TTL));
}

function msg(locale: string, ru: string, kk: string) {
  return locale === "kk" ? kk : ru;
}

function normalisePhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) return `+7${d.slice(1)}`;
  if (d.length === 10) return `+7${d}`;
  return p.trim();
}

export async function registerAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult> {
  const locale = String(formData.get("locale") ?? "ru");
  if (!authEnabled()) return { error: msg(locale, "Регистрация временно недоступна", "Тіркелу уақытша қолжетімсіз") };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = normalisePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  if (name.length < 2) return { error: msg(locale, "Укажите имя", "Атыңызды енгізіңіз") };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: msg(locale, "Проверьте e-mail", "E-mail дұрыс емес") };
  if (phone.replace(/\D/g, "").length < 10) return { error: msg(locale, "Проверьте телефон", "Телефон дұрыс емес") };
  if (password.length < 8) return { error: msg(locale, "Пароль не короче 8 символов", "Құпиясөз кемінде 8 таңба") };

  const sb = authClient();
  const { error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone },
  });
  if (error) {
    const dup = /already|exists|registered/i.test(error.message);
    return { error: dup ? msg(locale, "Этот e-mail уже зарегистрирован. Войдите или восстановите пароль.", "Бұл e-mail тіркелген. Кіріңіз немесе құпиясөзді қалпына келтіріңіз.") : error.message };
  }
  const { data, error: signErr } = await sb.auth.signInWithPassword({ email, password });
  if (signErr || !data.session) return { error: signErr?.message ?? "Sign-in failed" };
  await setSession(data.session.access_token, data.session.refresh_token);
  redirect(next && next.startsWith("/") ? next : `/${locale}/account`);
}

export async function loginAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult> {
  const locale = String(formData.get("locale") ?? "ru");
  if (!authEnabled()) return { error: msg(locale, "Вход временно недоступен", "Кіру уақытша қолжетімсіз") };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    await new Promise((r) => setTimeout(r, 400));
    return { error: msg(locale, "Неверный e-mail или пароль", "E-mail немесе құпиясөз қате") };
  }
  await setSession(data.session.access_token, data.session.refresh_token);
  redirect(next && next.startsWith("/") ? next : `/${locale}/account`);
}

export async function logoutAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "ru");
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  redirect(`/${locale}`);
}

export async function updateProfileAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult & { ok?: boolean }> {
  const locale = String(formData.get("locale") ?? "ru");
  const user = await getCurrentUser();
  if (!user) return { error: msg(locale, "Войдите в аккаунт", "Аккаунтқа кіріңіз") };
  const name = String(formData.get("name") ?? "").trim();
  const phone = normalisePhone(String(formData.get("phone") ?? ""));
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (name.length < 2) return { error: msg(locale, "Укажите имя", "Атыңызды енгізіңіз") };
  const { error } = await authClient().auth.admin.updateUserById(user.id, { user_metadata: { name, phone, city, address } });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function changePasswordAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult & { ok?: boolean }> {
  const locale = String(formData.get("locale") ?? "ru");
  const user = await getCurrentUser();
  if (!user) return { error: msg(locale, "Войдите в аккаунт", "Аккаунтқа кіріңіз") };
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: msg(locale, "Пароль не короче 8 символов", "Құпиясөз кемінде 8 таңба") };
  const sb = authClient();
  const { error: checkErr } = await sb.auth.signInWithPassword({ email: user.email, password: current });
  if (checkErr) return { error: msg(locale, "Текущий пароль неверный", "Қазіргі құпиясөз қате") };
  const { error } = await sb.auth.admin.updateUserById(user.id, { password });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function requestResetAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult & { ok?: boolean }> {
  const locale = String(formData.get("locale") ?? "ru");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: msg(locale, "Укажите e-mail", "E-mail енгізіңіз") };
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data, error } = await authClient().auth.admin.generateLink({ type: "recovery", email });
  // Do not reveal whether the e-mail exists.
  if (!error && data?.properties?.hashed_token) {
    const link = `${site}/${locale}/account/reset?token=${encodeURIComponent(data.properties.hashed_token)}`;
    await sendPasswordResetEmail(email, link);
  }
  return { ok: true };
}

export async function resetPasswordAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult> {
  const locale = String(formData.get("locale") ?? "ru");
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: msg(locale, "Пароль не короче 8 символов", "Құпиясөз кемінде 8 таңба") };
  const sb = authClient();
  const { data, error } = await sb.auth.verifyOtp({ type: "recovery", token_hash: token });
  if (error || !data.user) return { error: msg(locale, "Ссылка недействительна или устарела", "Сілтеме жарамсыз немесе ескірген") };
  const { error: upErr } = await sb.auth.admin.updateUserById(data.user.id, { password });
  if (upErr) return { error: upErr.message };
  if (data.session) await setSession(data.session.access_token, data.session.refresh_token);
  redirect(`/${locale}/account?reset=1`);
}
