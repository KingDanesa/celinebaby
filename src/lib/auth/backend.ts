import "server-only";
import type { SiteUser } from "@/lib/types";

/** Cookie values to set after a successful sign-in. */
export interface Session {
  /** Short-lived access token (Supabase only). */
  access?: { token: string; ttl: number };
  /** Long-lived token: Supabase refresh token, or our own session token. */
  refresh: { token: string; ttl: number };
}

export type RegisterResult = { ok: true } | { ok: false; exists: boolean; message: string };

export interface ProfileData {
  name: string;
  phone: string;
  city?: string;
  address?: string;
}

/**
 * Customer accounts. Two implementations:
 *  - `pg`: own tables in PostgreSQL (production server; data stays in Kazakhstan)
 *  - `supabase`: Supabase Auth (the Vercel demo)
 */
export interface AuthBackend {
  readonly name: "pg" | "supabase";
  currentUser(access: string | undefined, refresh: string | undefined): Promise<SiteUser | null>;
  register(input: ProfileData & { email: string; password: string }): Promise<RegisterResult>;
  signIn(email: string, password: string): Promise<Session | null>;
  signOut(access: string | undefined, refresh: string | undefined): Promise<void>;
  updateProfile(userId: string, data: ProfileData): Promise<string | null>;
  checkPassword(email: string, password: string): Promise<boolean>;
  setPassword(userId: string, password: string): Promise<string | null>;
  /** Returns a one-time token for the reset link, or null when the e-mail is unknown. */
  createResetToken(email: string): Promise<string | null>;
  /** Sets the new password; returns a session to sign the customer in, or null for a bad/expired token. */
  resetWithToken(token: string, password: string): Promise<Session | null>;
  listUsers(): Promise<SiteUser[]>;
}

let cached: AuthBackend | null | undefined;

export async function getAuthBackend(): Promise<AuthBackend | null> {
  if (cached !== undefined) return cached;
  if (process.env.DATABASE_URL) {
    cached = (await import("./pg")).pgAuth;
  } else if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    cached = (await import("./supabase")).supabaseAuth;
  } else {
    cached = null;
  }
  return cached;
}

export function authConfigured(): boolean {
  return !!(process.env.DATABASE_URL || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY));
}
