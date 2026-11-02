// Admin accounts from the server's command line (emergency access when e-mail is not available).
//   celinebaby-admin list
//   celinebaby-admin add <email> [name]     → prints a temporary password
//   celinebaby-admin reset <email>          → prints a new temporary password, signs the person out everywhere
//   celinebaby-admin remove <email>
import postgres from "postgres";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const [cmd, rawEmail, ...rest] = process.argv.slice(2);
const email = (rawEmail ?? "").trim().toLowerCase();
const url = process.env.DATABASE_URL;
if (!url || !cmd) {
  console.log("Usage: celinebaby-admin list | add <email> [name] | reset <email> | remove <email>");
  process.exit(cmd ? 1 : 0);
}

async function hash(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${key.toString("base64")}`;
}

// Readable temporary password: 4 groups of 4, no look-alike characters.
function tempPassword() {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  const chars = [...bytes].map((b) => abc[b % abc.length]).join("");
  return chars.match(/.{4}/g).join("-");
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  if (cmd === "list") {
    const rows = await sql`select email, name, password_hash = 'pending-invite' as pending, last_login_at from admin_users order by created_at`;
    if (!rows.length) console.log("No admins yet. Add one: celinebaby-admin add <email> [name]");
    for (const r of rows) console.log(`${r.email.padEnd(36)} ${(r.name || "").padEnd(20)} ${r.pending ? "invited" : "active"}  last login: ${r.last_login_at?.toISOString() ?? "never"}`);
  } else if (cmd === "add" || cmd === "reset") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Give a valid e-mail");
    const password = tempPassword();
    const h = await hash(password);
    if (cmd === "add") {
      const res = await sql`insert into admin_users (email, name, password_hash) values (${email}, ${rest.join(" ")}, ${h}) on conflict (email) do nothing returning id`;
      if (!res.length) throw new Error(`${email} already exists; use: celinebaby-admin reset ${email}`);
    } else {
      const res = await sql`update admin_users set password_hash = ${h}, updated_at = now() where email = ${email} returning id`;
      if (!res.length) throw new Error(`${email} is not an admin; use: celinebaby-admin add ${email}`);
      await sql`delete from admin_sessions where admin_id = ${res[0].id}`;
    }
    console.log(`\n  Login:    ${email}\n  Password: ${password}\n\n  Sign in at /admin and change it in "Доступ" → "Мой пароль".\n`);
  } else if (cmd === "remove") {
    const [{ n }] = await sql`select count(*)::int as n from admin_users`;
    if (n <= 1) throw new Error("This is the last admin; add another one first");
    const res = await sql`delete from admin_users where email = ${email} returning id`;
    console.log(res.length ? `Removed ${email}` : `${email} not found`);
  } else {
    throw new Error(`Unknown command: ${cmd}`);
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
