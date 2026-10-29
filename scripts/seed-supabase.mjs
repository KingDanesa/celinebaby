// Seeds the Supabase `products` table from the local JSON.
// Usage:  node --env-file=.env.local scripts/seed-supabase.mjs [path/to/products.json]
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (use --env-file=.env.local)");
  process.exit(1);
}
const file = process.argv[2] ?? (existsSync("data/products.json") ? "data/products.json" : "data/seed/products.json");
const products = JSON.parse(await readFile(file, "utf8"));
const sb = createClient(url, key, { auth: { persistSession: false } });

console.log(`Seeding ${products.length} products from ${file}…`);
const BATCH = 100;
for (let i = 0; i < products.length; i += BATCH) {
  const rows = products.slice(i, i + BATCH).map((p) => ({
    id: p.id,
    slug: p.slug,
    data: p,
    updated_at: p.updatedAt ?? new Date().toISOString(),
  }));
  const { error } = await sb.from("products").upsert(rows);
  if (error) {
    console.error("Failed at batch", i, error.message);
    process.exit(1);
  }
  console.log(`  ${Math.min(i + BATCH, products.length)} / ${products.length}`);
}
console.log("Done.");
