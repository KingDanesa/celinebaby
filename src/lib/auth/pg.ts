import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "@/lib/db";
import type { SiteUser } from "@/lib/types";
import type { AuthBackend, Session } from "./backend";

/**
 * Own customer accounts in PostgreSQL (tables users, sessions, password_resets — db/schema.sql).
 * Passwords: scrypt with a random salt. Sessions and reset links: random tokens, only their SHA-256 is stored.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const N = 16384,
  R = 8,
  P = 1,
  KEYLEN = 64;
const SESSION_TTL = 60 * 60 * 24 * 60; // 60 days
const RESET_TTL_MIN = 60;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Same work for unknown e-mails, so response time does not reveal which addresses exist.
const DUMMY = hashPassword(randomBytes(12).toString("hex"));

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

type Row = { id: string; email: string; name: string; phone: string; city: string | null; address: string | null; created_at: Date };
const toUser = (r: Row): SiteUser => ({
  id: r.id,
  email: r.email,
  name: r.name,
  phone: r.phone,
  city: r.city ?? undefined,
  address: r.address ?? undefined,
  createdAt: r.created_at.toISOString(),
});

async function createSession(userId: string): Promise<Session> {
  const token = newToken();
  await db()`insert into sessions (token_hash, user_id, expires_at) values (${sha256(token)}, ${userId}, now() + ${`${SESSION_TTL} seconds`}::interval)`;
  // Housekeeping: drop this customer's expired sessions.
  await db()`delete from sessions where user_id = ${userId} and expires_at < now()`;
  return { refresh: { token, ttl: SESSION_TTL } };
}

export const pgAuth: AuthBackend = {
  name: "pg",

  async currentUser(_access, refresh) {
    if (!refresh || refresh.length > 200) return null;
    try {
      const [row] = await db()<Row[]>`
        select u.id, u.email, u.name, u.phone, u.city, u.address, u.created_at
          from sessions s join users u on u.id = s.user_id
         where s.token_hash = ${sha256(refresh)} and s.expires_at > now()`;
      return row ? toUser(row) : null;
    } catch (e) {
      console.error("[auth] currentUser failed", e);
      return null;
    }
  },

  async register({ email, password, name, phone }) {
    const hash = await hashPassword(password);
    const res = await db()`
      insert into users (email, password_hash, name, phone) values (${email}, ${hash}, ${name}, ${phone})
      on conflict (email) do nothing`;
    if (res.count === 0) return { ok: false, exists: true, message: "exists" };
    return { ok: true };
  },

  async signIn(email, password) {
    const [row] = await db()`select id, password_hash from users where email = ${email}`;
    if (!row) {
      await verifyPassword(password, await DUMMY);
      return null;
    }
    if (!(await verifyPassword(password, row.password_hash as string))) return null;
    return createSession(row.id as string);
  },

  async signOut(_access, refresh) {
    if (refresh) await db()`delete from sessions where token_hash = ${sha256(refresh)}`;
  },

  async updateProfile(userId, d) {
    await db()`
      update users set name = ${d.name}, phone = ${d.phone}, city = ${d.city || null}, address = ${d.address || null}, updated_at = now()
       where id = ${userId}`;
    return null;
  },

  async checkPassword(email, password) {
    const [row] = await db()`select password_hash from users where email = ${email}`;
    return !!row && verifyPassword(password, row.password_hash as string);
  },

  async setPassword(userId, password) {
    const hash = await hashPassword(password);
    await db()`update users set password_hash = ${hash}, updated_at = now() where id = ${userId}`;
    // Changing the password signs out every other device.
    await db()`delete from sessions where user_id = ${userId}`;
    return null;
  },

  async createResetToken(email) {
    const [row] = await db()`select id from users where email = ${email}`;
    if (!row) return null;
    const token = newToken();
    await db()`delete from password_resets where user_id = ${row.id} or expires_at < now()`;
    await db()`insert into password_resets (token_hash, user_id, expires_at) values (${sha256(token)}, ${row.id}, now() + ${`${RESET_TTL_MIN} minutes`}::interval)`;
    return token;
  },

  async resetWithToken(token, password) {
    if (!token || token.length > 200) return null;
    const hash = await hashPassword(password);
    const userId = await db().begin(async (sql) => {
      const [row] = await sql`
        update password_resets set used_at = now()
         where token_hash = ${sha256(token)} and used_at is null and expires_at > now()
         returning user_id`;
      if (!row) return null;
      await sql`update users set password_hash = ${hash}, updated_at = now() where id = ${row.user_id}`;
      await sql`delete from sessions where user_id = ${row.user_id}`;
      return row.user_id as string;
    });
    return userId ? createSession(userId) : null;
  },

  async listUsers() {
    const rows = await db()<Row[]>`select id, email, name, phone, city, address, created_at from users order by created_at desc`;
    return rows.map(toUser);
  },
};
