import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { SiteUser } from "@/lib/types";
import type { AuthBackend, Session } from "./backend";

/** Supabase Auth — used by the Vercel demo only. */

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (client) return client;
  client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

const REFRESH_TTL = 60 * 60 * 24 * 30;

function toSiteUser(u: User): SiteUser {
  const m = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return { id: u.id, email: u.email ?? "", name: m.name ?? "", phone: m.phone ?? "", city: m.city, address: m.address, createdAt: u.created_at };
}

function session(s: { access_token: string; refresh_token: string; expires_in?: number }): Session {
  return { access: { token: s.access_token, ttl: s.expires_in ?? 3600 }, refresh: { token: s.refresh_token, ttl: REFRESH_TTL } };
}

export const supabaseAuth: AuthBackend = {
  name: "supabase",

  async currentUser(access) {
    if (!access) return null;
    try {
      const { data, error } = await sb().auth.getUser(access);
      return error || !data.user ? null : toSiteUser(data.user);
    } catch {
      return null;
    }
  },

  async register({ email, password, name, phone }) {
    const { error } = await sb().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, phone } });
    if (error) return { ok: false, exists: /already|exists|registered/i.test(error.message), message: error.message };
    return { ok: true };
  },

  async signIn(email, password) {
    const { data, error } = await sb().auth.signInWithPassword({ email, password });
    return error || !data.session ? null : session(data.session);
  },

  async signOut() {},

  async updateProfile(userId, data) {
    const { error } = await sb().auth.admin.updateUserById(userId, { user_metadata: data });
    return error?.message ?? null;
  },

  async checkPassword(email, password) {
    const { error } = await sb().auth.signInWithPassword({ email, password });
    return !error;
  },

  async setPassword(userId, password) {
    const { error } = await sb().auth.admin.updateUserById(userId, { password });
    return error?.message ?? null;
  },

  async createResetToken(email) {
    const { data, error } = await sb().auth.admin.generateLink({ type: "recovery", email });
    return error ? null : (data?.properties?.hashed_token ?? null);
  },

  async resetWithToken(token, password) {
    const { data, error } = await sb().auth.verifyOtp({ type: "recovery", token_hash: token });
    if (error || !data.user) return null;
    const { error: upErr } = await sb().auth.admin.updateUserById(data.user.id, { password });
    if (upErr || !data.session) return null;
    return session(data.session);
  },

  async listUsers() {
    const { data } = await sb().auth.admin.listUsers({ page: 1, perPage: 1000 });
    return (data?.users ?? []).map(toSiteUser);
  },
};
