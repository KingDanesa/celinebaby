// Creates / updates the database tables from db/schema.sql (safe to run on every deploy).
// Usage: npm run db:migrate   (needs DATABASE_URL)
import postgres from "postgres";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql.unsafe(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  const [{ products }] = await sql`select count(*)::int as products from products`;
  const [{ orders }] = await sql`select count(*)::int as orders from orders`;
  console.log(`Schema is up to date. products=${products} orders=${orders}`);
} finally {
  await sql.end();
}
