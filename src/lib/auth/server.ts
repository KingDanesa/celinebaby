import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { SiteUser } from "@/lib/types";
import { authConfigured, getAuthBackend } from "./backend";

export const ACCESS_COOKIE = "cb_at";
export const REFRESH_COOKIE = "cb_rt";

export function authEnabled(): boolean {
  return authConfigured();
}

/** Current signed-in customer, or null. Safe to call from server components; cached per request. */
export const getCurrentUser = cache(async (): Promise<SiteUser | null> => {
  const backend = await getAuthBackend();
  if (!backend) return null;
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return null;
  return backend.currentUser(access, refresh);
});

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});
