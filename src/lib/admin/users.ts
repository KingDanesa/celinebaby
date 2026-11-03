import "server-only";
import { db } from "@/lib/db";
import { burnPasswordCheck, hashPassword, newToken, sha256, verifyPassword } from "@/lib/password";

/**
 * Admin accounts in PostgreSQL (admin_users, admin_sessions, admin_password_resets — db/schema.sql).
 * Each person signs in with their own e-mail and password; the owner adds and removes people in "Доступ".
 */

export type AdminRole = "owner" | "staff";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string | null;
  /** Invited but has not set a password yet. */
  pending: boolean;
  /** owner: manages staff accounts and reads the activity log; staff: everything else. */
  role: AdminRole;
}

export const ADMIN_SESSION_TTL = 60 * 60 * 24 * 14; // 14 days
const RESET_TTL_MIN = 60;
const INVITE_TTL_MIN = 60 * 24 * 3; // 3 days
const PENDING = "pending-invite";

type Row = { id: string; email: string; name: string; password_hash: string; role: string; created_at: Date; last_login_at: Date | null };
const toAdmin = (r: Row): AdminUser => ({
  id: r.id,
  email: r.email,
  name: r.name,
  createdAt: r.created_at.toISOString(),
  lastLoginAt: r.last_login_at?.toISOString() ?? null,
  pending: r.password_hash === PENDING,
  role: r.role === "owner" ? "owner" : "staff",
});

export const normEmail = (e: string) => e.trim().toLowerCase().slice(0, 120);

export async function getAdmin(id: string): Promise<AdminUser | null> {
  const [row] = await db()<Row[]>`select * from admin_users where id = ${id}`;
  return row ? toAdmin(row) : null;
}

export async function countAdmins(): Promise<number> {
  const [row] = await db()`select count(*)::int as n from admin_users`;
  return row.n as number;
}

export async function listAdmins(): Promise<AdminUser[]> {
  const rows = await db()<Row[]>`select * from admin_users order by created_at`;
  return rows.map(toAdmin);
}

async function createSession(adminId: string): Promise<string> {
  const token = newToken();
  await db()`insert into admin_sessions (token_hash, admin_id, expires_at) values (${sha256(token)}, ${adminId}, now() + ${`${ADMIN_SESSION_TTL} seconds`}::interval)`;
  await db()`delete from admin_sessions where admin_id = ${adminId} and expires_at < now()`;
  await db()`update admin_users set last_login_at = now() where id = ${adminId}`;
  return token;
}

export async function adminFromSession(token: string | undefined): Promise<AdminUser | null> {
  if (!token || token.length > 200) return null;
  const [row] = await db()<Row[]>`
    select a.* from admin_sessions s join admin_users a on a.id = s.admin_id
     where s.token_hash = ${sha256(token)} and s.expires_at > now()`;
  return row ? toAdmin(row) : null;
}

/** Returns a session token, or null for a wrong e-mail/password. */
export async function signInAdmin(email: string, password: string): Promise<string | null> {
  const [row] = await db()<Row[]>`select * from admin_users where email = ${normEmail(email)}`;
  if (!row || row.password_hash === PENDING) {
    await burnPasswordCheck(password);
    return null;
  }
  if (!(await verifyPassword(password, row.password_hash))) return null;
  return createSession(row.id);
}

/** First start: nobody exists yet, so the ADMIN_PASSWORD from the server settings creates the first admin. */
export async function bootstrapFirstAdmin(email: string, password: string): Promise<string | null> {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || password !== expected || (await countAdmins()) > 0) return null;
  const hash = await hashPassword(password);
  const [row] = await db()`insert into admin_users (email, name, password_hash, role) values (${normEmail(email)}, '', ${hash}, 'owner') returning id`;
  return createSession(row.id as string);
}

export async function signOutAdmin(token: string | undefined) {
  if (token) await db()`delete from admin_sessions where token_hash = ${sha256(token)}`;
}

/** Changes the password; other devices are signed out, this one gets a fresh session. */
export async function changeAdminPassword(adminId: string, current: string, next: string): Promise<string | "wrong"> {
  const [row] = await db()<Row[]>`select * from admin_users where id = ${adminId}`;
  if (!row || !(await verifyPassword(current, row.password_hash))) return "wrong";
  await db()`update admin_users set password_hash = ${await hashPassword(next)}, updated_at = now() where id = ${adminId}`;
  await db()`delete from admin_sessions where admin_id = ${adminId}`;
  return createSession(adminId);
}

async function issueReset(adminId: string, minutes: number): Promise<string> {
  const token = newToken();
  await db()`delete from admin_password_resets where admin_id = ${adminId} or expires_at < now()`;
  await db()`insert into admin_password_resets (token_hash, admin_id, expires_at) values (${sha256(token)}, ${adminId}, now() + ${`${minutes} minutes`}::interval)`;
  return token;
}

/** Token for a "set a new password" link, or null when the e-mail is not an admin. */
export async function createAdminReset(email: string): Promise<{ token: string; name: string } | null> {
  const [row] = await db()<Row[]>`select * from admin_users where email = ${normEmail(email)}`;
  if (!row) return null;
  return { token: await issueReset(row.id, row.password_hash === PENDING ? INVITE_TTL_MIN : RESET_TTL_MIN), name: row.name };
}

export async function adminForResetToken(token: string): Promise<AdminUser | null> {
  if (!token || token.length > 200) return null;
  const [row] = await db()<Row[]>`
    select a.* from admin_password_resets r join admin_users a on a.id = r.admin_id
     where r.token_hash = ${sha256(token)} and r.used_at is null and r.expires_at > now()`;
  return row ? toAdmin(row) : null;
}

/** Sets the password from a reset/invite link; returns a session token, or null for a bad/expired link. */
export async function resetAdminPassword(token: string, password: string): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const hash = await hashPassword(password);
  const adminId = await db().begin(async (sql) => {
    const [row] = await sql`
      update admin_password_resets set used_at = now()
       where token_hash = ${sha256(token)} and used_at is null and expires_at > now()
       returning admin_id`;
    if (!row) return null;
    await sql`update admin_users set password_hash = ${hash}, updated_at = now() where id = ${row.admin_id}`;
    await sql`delete from admin_sessions where admin_id = ${row.admin_id}`;
    return row.admin_id as string;
  });
  return adminId ? createSession(adminId) : null;
}

/** Adds a person; they set their own password from the invite link. */
export async function inviteAdmin(email: string, name: string): Promise<{ token: string } | "exists"> {
  const res = await db()`
    insert into admin_users (email, name, password_hash, role) values (${normEmail(email)}, ${name.trim().slice(0, 80)}, ${PENDING}, 'staff')
    on conflict (email) do nothing returning id`;
  if (!res.length) return "exists";
  return { token: await issueReset(res[0].id as string, INVITE_TTL_MIN) };
}

export async function removeAdmin(id: string) {
  await db()`delete from admin_users where id = ${id}`;
}
