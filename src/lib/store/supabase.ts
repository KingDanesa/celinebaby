import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/types";
import type { Order, Store } from "./types";

/**
 * Supabase backend. Schema: see supabase/schema.sql
 *   products(id bigint pk, slug text unique, data jsonb, updated_at timestamptz)
 *   orders(id text pk, status text, data jsonb, created_at timestamptz)
 *   storage bucket "product-images" (public)
 */
let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

const BUCKET = process.env.SUPABASE_BUCKET || "product-images";

function fail(ctx: string, error: { message: string } | null) {
  if (error) throw new Error(`${ctx}: ${error.message}`);
}

export const supabaseStore: Store = {
  name: "supabase",

  async listProducts() {
    const rows: Product[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
      const { data, error } = await sb()
        .from("products")
        .select("data")
        .order("id", { ascending: false })
        .range(from, from + page - 1);
      fail("listProducts", error);
      for (const r of data ?? []) rows.push(r.data as Product);
      if (!data || data.length < page) break;
    }
    return rows;
  },

  async getProduct(id) {
    const { data, error } = await sb().from("products").select("data").eq("id", id).maybeSingle();
    fail("getProduct", error);
    return (data?.data as Product) ?? null;
  },

  async saveProduct(product) {
    const { error } = await sb()
      .from("products")
      .upsert({ id: product.id, slug: product.slug, data: product, updated_at: new Date().toISOString() });
    fail("saveProduct", error);
    return product;
  },

  async deleteProduct(id) {
    const { error } = await sb().from("products").delete().eq("id", id);
    fail("deleteProduct", error);
  },

  async nextProductId() {
    const { data, error } = await sb().from("products").select("id").order("id", { ascending: false }).limit(1);
    fail("nextProductId", error);
    return ((data?.[0]?.id as number) ?? 0) + 1;
  },

  async uploadImage({ bytes, contentType, name }) {
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const safe = name.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "img";
    const file = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}.${ext}`;
    const { error } = await sb().storage.from(BUCKET).upload(file, bytes, { contentType, upsert: false });
    fail("uploadImage", error);
    const { data } = sb().storage.from(BUCKET).getPublicUrl(file);
    return { url: data.publicUrl };
  },

  async deleteImage(url) {
    const marker = `/object/public/${BUCKET}/`;
    const i = url.indexOf(marker);
    if (i === -1) return;
    const file = decodeURIComponent(url.slice(i + marker.length));
    await sb().storage.from(BUCKET).remove([file]);
  },

  async listOrders() {
    const { data, error } = await sb().from("orders").select("data").order("created_at", { ascending: false });
    fail("listOrders", error);
    return (data ?? []).map((r) => r.data as Order);
  },

  async getOrder(id) {
    const { data, error } = await sb().from("orders").select("data").eq("id", id).maybeSingle();
    fail("getOrder", error);
    return (data?.data as Order) ?? null;
  },

  async getOrderByInvoice(invoiceId) {
    const { data, error } = await sb().from("orders").select("data").eq("data->>invoiceId", invoiceId).maybeSingle();
    fail("getOrderByInvoice", error);
    return (data?.data as Order) ?? null;
  },

  async listOrdersForUser(userId, email) {
    const parts: string[] = [];
    if (userId) parts.push(`data->>userId.eq.${userId}`);
    if (email) parts.push(`data->customer->>email.ilike.${email}`);
    if (!parts.length) return [];
    const { data, error } = await sb().from("orders").select("data").or(parts.join(",")).order("created_at", { ascending: false });
    fail("listOrdersForUser", error);
    return (data ?? []).map((r) => r.data as Order);
  },

  async saveOrder(order) {
    const { error } = await sb()
      .from("orders")
      .upsert({ id: order.id, status: order.status, data: order, created_at: order.createdAt });
    fail("saveOrder", error);
    return order;
  },
};
