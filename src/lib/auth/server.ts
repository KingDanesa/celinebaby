import "server-only";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { SiteUser } from "@/lib/types";

export const ACCESS_COOKIE = "cb_at";
export const REFRESH_COOKIE = "cb_rt";

let client: SupabaseClient | null = null;
export function authClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not set (needed for accounts)");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return client;
}

export function authEnabled(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function toSiteUser(u: User): SiteUser {
  const m = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    id: u.id,
    email: u.email ?? "",
    name: m.name ?? "",
    phone: m.phone ?? "",
    city: m.city,
    address: m.address,
    createdAt: u.created_at,
  };
}

/** Current signed-in customer, or null. Safe to call from server components. */
export async function getCurrentUser(): Promise<SiteUser | null> {
  if (!authEnabled()) return null;
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const { data, error } = await authClient().auth.getUser(token);
    if (error || !data.user) return null;
    return toSiteUser(data.user);
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});
