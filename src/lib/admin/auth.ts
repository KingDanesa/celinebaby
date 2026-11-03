import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminUser } from "./users";

/**
 * Two modes:
 *  - with DATABASE_URL (production server): personal admin accounts, see ./users.ts;
 *  - without it (the Vercel demo, local files): one shared ADMIN_PASSWORD and an HMAC-signed cookie.
 */

export const SESSION_COOKIE = "cb_admin";
const TTL_SECONDS = 60 * 60 * 24 * 14; // two weeks

export const adminAccountsEnabled = () => !!process.env.DATABASE_URL;

function secret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error("ADMIN_SECRET is not set");
  return s;
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Buffer.from(sig).toString("base64url");
}

export async function createSessionValue(): Promise<string> {
  const exp = String(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  return `${exp}.${await hmac(exp)}`;
}

export async function verifySessionValue(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

/** The signed-in admin, or null. Cached per request. */
export const currentAdmin = cache(async (): Promise<AdminUser | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  if (adminAccountsEnabled()) {
    const { adminFromSession } = await import("./users");
    return adminFromSession(value).catch(() => null);
  }
  return (await verifySessionValue(value))
    ? { id: "shared", email: "", name: "Администратор", createdAt: "", lastLoginAt: null, pending: false, role: "owner" }
    : null;
});

export async function isAdmin(): Promise<boolean> {
  return !!(await currentAdmin());
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Pages and actions only the owner may use (staff accounts, activity log). */
export async function requireOwner(): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin");
  return admin;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || input.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ input.charCodeAt(i);
  return diff === 0;
}

export const adminCookie = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});
