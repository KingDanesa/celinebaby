// One-off: products previously tagged "new" get the admin checkbox `showInNew`.
// Usage: node --env-file=.env.local scripts/migrate-show-in-new.mjs   (updates Supabase when configured, else data/products.json)
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const flag = (p) => {
  const was = p.showInNew === true || (Array.isArray(p.tags) && p.tags.includes("new"));
  return { ...p, showInNew: was, tags: (p.tags ?? []).filter((t) => t !== "new") };
};

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.from("products").select("id, slug, data");
  if (error) throw error;
  let n = 0;
  for (const row of data) {
    const next = flag(row.data);
    if (JSON.stringify(next) !== JSON.stringify(row.data)) {
      const { error: e } = await sb.from("products").update({ data: next, updated_at: new Date().toISOString() }).eq("id", row.id);
      if (e) throw e;
      n++;
    }
  }
  console.log(`Supabase: updated ${n} of ${data.length}, flagged ${data.filter((r) => flag(r.data).showInNew).length}`);
}
for (const file of ["data/products.json", "data/seed/products.json"]) {
  if (!existsSync(file)) continue;
  const list = JSON.parse(await readFile(file, "utf8")).map(flag);
  await writeFile(file, JSON.stringify(list, null, 1), "utf8");
  console.log(`${file}: flagged ${list.filter((p) => p.showInNew).length} of ${list.length}`);
}
