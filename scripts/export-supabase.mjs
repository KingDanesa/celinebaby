// Step 1 of the move: takes everything the team edited on the demo (Supabase) and puts it into a folder
// ("bundle") ready for the production server:
//   <out>/products.json, <out>/orders.json      — data with image URLs rewritten to the server's own paths
//   <out>/media/uploads/...                      — photos uploaded in the demo admin (downloaded from Supabase Storage)
//   <out>/old-images.txt                         — photos still taken from the old site (/image/...), for collect-old-images.py
//
// Usage: node --env-file=.env.local scripts/export-supabase.mjs deploy/local/bundle
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const out = process.argv[2] || "deploy/local/bundle";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || "product-images";
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set (use --env-file=.env.local)");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

async function all(table, order) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select("data").order(order, { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data.map((r) => r.data));
    if (data.length < 1000) break;
  }
  return rows;
}

const OLD_SITE = /^https?:\/\/(?:www\.)?celinebaby\.kz(\/image\/.+)$/i;
const STORAGE = `/storage/v1/object/public/${bucket}/`;
const uploads = new Map(); // storage file → local url
const oldImages = new Set();

function rewrite(u) {
  if (typeof u !== "string" || !u) return u;
  const old = u.match(OLD_SITE);
  if (old) {
    const p = safeDecode(old[1]);
    oldImages.add(p);
    return p;
  }
  if (u.startsWith("/image/")) {
    oldImages.add(safeDecode(u));
    return safeDecode(u);
  }
  const i = u.indexOf(STORAGE);
  if (i !== -1) {
    const file = decodeURIComponent(u.slice(i + STORAGE.length).split("?")[0]);
    const local = `/uploads/${path.basename(file)}`;
    uploads.set(file, local);
    return local;
  }
  return u;
}

function safeDecode(p) {
  try {
    return /%[0-9A-Fa-f]{2}/.test(p) ? decodeURI(p) : p;
  } catch {
    return p;
  }
}

console.log("Reading products and orders from Supabase…");
const products = (await all("products", "id")).map((p) => ({
  ...p,
  images: (p.images ?? []).map(rewrite),
  imagesFull: (p.imagesFull ?? []).map(rewrite),
}));
const orders = (await all("orders", "created_at")).map((o) => ({
  ...o,
  items: (o.items ?? []).map((i) => ({ ...i, image: rewrite(i.image) })),
}));

await mkdir(path.join(out, "media", "uploads"), { recursive: true });
await writeFile(path.join(out, "products.json"), JSON.stringify(products));
await writeFile(path.join(out, "orders.json"), JSON.stringify(orders));
await writeFile(path.join(out, "old-images.txt"), [...oldImages].sort().join("\n") + "\n");

console.log(`Downloading ${uploads.size} uploaded photos…`);
let ok = 0;
const failed = [];
for (const [file, local] of uploads) {
  const dest = path.join(out, "media", local);
  if (existsSync(dest)) {
    ok++;
    continue;
  }
  const { data, error } = await sb.storage.from(bucket).download(file);
  if (error || !data) {
    failed.push(file);
    continue;
  }
  await writeFile(dest, Buffer.from(await data.arrayBuffer()));
  ok++;
}

console.log(`products=${products.length} orders=${orders.length} uploads=${ok}/${uploads.size} old-site photos=${oldImages.size}`);
if (failed.length) console.log("Could not download:", failed.join(", "));
console.log(`Next: python scripts/collect-old-images.py <well-known.zip> ${out}`);
