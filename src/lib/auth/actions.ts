"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, getCurrentUser } from "./server";
import { getAuthBackend, type Session } from "./backend";
import { sendPasswordResetEmail } from "@/lib/email";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";

/** `values` returns what the customer typed (never passwords), so the form keeps it after an error. */
export type AuthResult = { error?: string; values?: Record<string, string> };

async function setSession(s: Session) {
  const jar = await cookies();
  if (s.access) jar.set(ACCESS_COOKIE, s.access.token, cookieOptions(s.access.ttl));
  else jar.delete(ACCESS_COOKIE);
  jar.set(REFRESH_COOKIE, s.refresh.token, cookieOptions(s.refresh.ttl));
}

function msg(locale: string, ru: string, kk: string) {
  return locale === "kk" ? kk : ru;
}

function normalisePhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) return `+7${d.slice(1)}`;
  if (d.length === 10) return `+7${d}`;
  return p.trim().slice(0, 40);
}

const safeNext = (next: string, locale: string) => (next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}/account`);
const slow = () => new Promise((r) => setTimeout(r, 400));

export async function registerAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult> {
  const locale = String(formData.get("locale") ?? "ru");
  const backend = await getAuthBackend();
  if (!backend) return { error: msg(locale, "Регистрация временно недоступна", "Тіркелу уақытша қолжетімсіз") };
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  const phone = normalisePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  if (name.length < 2) return { values: { name, email, phone }, error: msg(locale, "Укажите имя", "Атыңызды енгізіңіз") };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { values: { name, email, phone }, error: msg(locale, "Проверьте e-mail", "E-mail дұрыс емес") };
  if (phone.replace(/\D/g, "").length < 10) return { values: { name, email, phone }, error: msg(locale, "Проверьте телефон", "Телефон дұрыс емес") };
  if (password.length < 8 || password.length > 200) return { values: { name, email, phone }, error: msg(locale, "Пароль не короче 8 символов", "Құпиясөз кемінде 8 таңба") };
  if (tooMany(`reg:${await clientIp()}`, 10, 3600)) return { values: { name, email, phone }, error: msg(locale, "Слишком много попыток, попробуйте позже", "Тым көп әрекет, кейінірек көріңіз") };

  const res = await backend.register({ email, password, name, phone });
  if (!res.ok) {
    return {
      values: { name, email, phone },
      error: res.exists
        ? msg(locale, "Этот e-mail уже зарегистрирован. Войдите или восстановите пароль.", "Бұл e-mail тіркелген. Кіріңіз немесе құпиясөзді қалпына келтіріңіз.")
        : res.message,
    };
  }
  const session = await backend.signIn(email, password);
  if (!session) return { values: { name, email, phone }, error: msg(locale, "Не удалось войти, попробуйте ещё раз", "Кіру мүмкін болмады, қайталап көріңіз") };
  await setSession(session);
  redirect(safeNext(next, locale));
}

export async function loginAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult> {
  const locale = String(formData.get("locale") ?? "ru");
  const backend = await getAuthBackend();
  if (!backend) return { error: msg(locale, "Вход временно недоступен", "Кіру уақытша қолжетімсіз") };
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const next = String(formData.get("next") ?? "");
  const ip = await clientIp();
  if (tooMany(`login:${ip}`, 30, 900) || tooMany(`login:${email}`, 10, 900)) {
    await slow();
    return { values: { email }, error: msg(locale, "Слишком много попыток входа. Подождите 15 минут или восстановите пароль.", "Тым көп кіру әрекеті. 15 минут күтіңіз немесе құпиясөзді қалпына келтіріңіз.") };
  }
  const session = await backend.signIn(email, password);
  if (!session) {
    await slow();
    return { values: { email }, error: msg(locale, "Неверный e-mail или пароль", "E-mail немесе құпиясөз қате") };
  }
  await setSession(session);
  redirect(safeNext(next, locale));
}

export async function logoutAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "ru");
  const jar = await cookies();
  const backend = await getAuthBackend();
  await backend?.signOut(jar.get(ACCESS_COOKIE)?.value, jar.get(REFRESH_COOKIE)?.value).catch(() => {});
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  redirect(`/${locale === "kk" ? "kk" : "ru"}`);
}

export async function updateProfileAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult & { ok?: boolean }> {
  const locale = String(formData.get("locale") ?? "ru");
  const user = await getCurrentUser();
  const backend = await getAuthBackend();
  if (!user || !backend) return { error: msg(locale, "Войдите в аккаунт", "Аккаунтқа кіріңіз") };
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const phone = normalisePhone(String(formData.get("phone") ?? ""));
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const address = String(formData.get("address") ?? "").trim().slice(0, 300);
  if (name.length < 2) return { error: msg(locale, "Укажите имя", "Атыңызды енгізіңіз") };
  const error = await backend.updateProfile(user.id, { name, phone, city, address });
  return error ? { error } : { ok: true };
}

export async function changePasswordAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult & { ok?: boolean }> {
  const locale = String(formData.get("locale") ?? "ru");
  const user = await getCurrentUser();
  const backend = await getAuthBackend();
  if (!user || !backend) return { error: msg(locale, "Войдите в аккаунт", "Аккаунтқа кіріңіз") };
  const current = String(formData.get("current") ?? "").slice(0, 200);
  const password = String(formData.get("password") ?? "");
  if (password.length < 8 || password.length > 200) return { error: msg(locale, "Пароль не короче 8 символов", "Құпиясөз кемінде 8 таңба") };
  if (tooMany(`pw:${user.id}`, 10, 900)) return { error: msg(locale, "Слишком много попыток, попробуйте позже", "Тым көп әрекет, кейінірек көріңіз") };
  if (!(await backend.checkPassword(user.email, current))) return { error: msg(locale, "Текущий пароль неверный", "Қазіргі құпиясөз қате") };
  const error = await backend.setPassword(user.id, password);
  if (error) return { error };
  // Our own sessions are all revoked on a password change: sign this device in again.
  if (backend.name === "pg") {
    const session = await backend.signIn(user.email, password);
    if (session) await setSession(session);
  }
  return { ok: true };
}

export async function requestResetAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult & { ok?: boolean }> {
  const locale = String(formData.get("locale") ?? "ru");
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  if (!email) return { error: msg(locale, "Укажите e-mail", "E-mail енгізіңіз") };
  const backend = await getAuthBackend();
  if (!backend) return { error: msg(locale, "Восстановление временно недоступно", "Қалпына келтіру уақытша қолжетімсіз") };
  // Silently drop floods; the answer is the same either way so it does not reveal which e-mails exist.
  if (!tooMany(`reset:${email}`, 3, 3600) && !tooMany(`reset-ip:${await clientIp()}`, 10, 3600)) {
    const token = await backend.createResetToken(email);
    if (token) {
      const site = siteUrl();
      await sendPasswordResetEmail(email, `${site}/${locale}/account/reset?token=${encodeURIComponent(token)}`, locale);
    }
  }
  return { ok: true };
}

export async function resetPasswordAction(_prev: AuthResult | undefined, formData: FormData): Promise<AuthResult> {
  const locale = String(formData.get("locale") ?? "ru");
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8 || password.length > 200) return { error: msg(locale, "Пароль не короче 8 символов", "Құпиясөз кемінде 8 таңба") };
  const backend = await getAuthBackend();
  const session = backend ? await backend.resetWithToken(token, password) : null;
  if (!session) return { error: msg(locale, "Ссылка недействительна или устарела", "Сілтеме жарамсыз немесе ескірген") };
  await setSession(session);
  redirect(`/${locale}/account?reset=1`);
}
