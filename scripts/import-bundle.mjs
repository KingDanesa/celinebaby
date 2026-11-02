// Step 3 of the move (on the server): loads the bundle into PostgreSQL and the media folder.
// Usage: npm run import:bundle -- /path/to/bundle            (needs DATABASE_URL, MEDIA_DIR)
//        --replace      wipe products first
//        --with-orders  also load the demo's orders (they are test orders, skipped by default)
import postgres from "postgres";
import { cp, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const bundle = process.argv.find((a, i) => i > 1 && !a.startsWith("--"));
const replace = process.argv.includes("--replace");
const withOrders = process.argv.includes("--with-orders");
const url = process.env.DATABASE_URL;
const media = path.resolve(process.env.MEDIA_DIR || "media");
if (!bundle || !url) {
  console.error("Usage: DATABASE_URL=… MEDIA_DIR=… node scripts/import-bundle.mjs <bundle> [--replace]");
  process.exit(1);
}

const sql = postgres(url, { max: 2, onnotice: () => {} });
try {
  await sql.unsafe(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  const products = JSON.parse(await readFile(path.join(bundle, "products.json"), "utf8"));
  const orders = withOrders && existsSync(path.join(bundle, "orders.json")) ? JSON.parse(await readFile(path.join(bundle, "orders.json"), "utf8")) : [];

  await sql.begin(async (tx) => {
    if (replace) await tx`delete from products`;
    for (const p of products) {
      await tx`
        insert into products (id, slug, data, updated_at)
        values (${p.id}, ${p.slug}, ${tx.json(p)}, ${p.updatedAt ?? new Date().toISOString()})
        on conflict (id) do update set slug = excluded.slug, data = excluded.data, updated_at = excluded.updated_at`;
    }
    for (const o of orders) {
      const row = { ...o, version: o.version ?? 0 };
      await tx`
        insert into orders (id, status, user_id, email, version, data, created_at)
        values (${o.id}, ${o.status}, ${o.userId ?? null}, ${o.customer?.email ?? null}, ${row.version}, ${tx.json(row)}, ${o.createdAt})
        on conflict (id) do nothing`;
      const invoices = new Set([o.invoiceId, ...(o.payments ?? []).map((p) => p.invoiceId)].filter(Boolean));
      for (const inv of invoices) {
        await tx`insert into order_invoices (invoice_id, order_id) values (${inv}, ${o.id}) on conflict do nothing`;
      }
    }
  });
  console.log(`database: products=${products.length} orders=${orders.length}`);

  const src = path.join(bundle, "media");
  if (existsSync(src)) {
    await cp(src, media, { recursive: true, force: false, errorOnExist: false });
    console.log(`media copied to ${media}`);
  }
} finally {
  await sql.end();
}
