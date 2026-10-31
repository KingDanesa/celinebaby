import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";

const ACCESS_COOKIE = "cb_at";
const REFRESH_COOKIE = "cb_rt";

function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Number(payload.exp) || 0;
  } catch {
    return 0;
  }
}

/** Refresh the customer session with Supabase when the access token is about to expire. */
async function refreshSession(request: NextRequest, response: NextResponse) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!refresh || !url || !key) return;
  const now = Math.floor(Date.now() / 1000);
  if (access && jwtExp(access) - now > 120) return;
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(ACCESS_COOKIE, data.access_token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: data.expires_in });
    response.cookies.set(REFRESH_COOKIE, data.refresh_token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 30 });
  } catch {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/")) return;

  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    const cookie = request.cookies.get("locale")?.value;
    const locale = locales.includes(cookie as (typeof locales)[number]) ? (cookie as (typeof locales)[number]) : defaultLocale;
    request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // Protected account pages (login/register/forgot/reset are public).
  const m = pathname.match(/^\/(ru|kk)\/account(?:\/(.*))?$/);
  if (m) {
    const sub = m[2] ?? "";
    const isPublic = ["login", "register", "forgot", "reset"].some((p) => sub === p || sub.startsWith(`${p}/`));
    if (!isPublic && !request.cookies.get(REFRESH_COOKIE)) {
      const to = request.nextUrl.clone();
      to.pathname = `/${m[1]}/account/login`;
      to.searchParams.set("next", pathname);
      return NextResponse.redirect(to);
    }
  }

  const response = NextResponse.next();
  await refreshSession(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next|api|admin|brand|img|video|uploads|favicon.ico|.*\\..*).*)"],
};
