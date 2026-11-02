import type postgres from "postgres";
import { db } from "@/lib/db";
import { deleteUpload, saveUpload } from "@/lib/media";
import type { Product } from "@/lib/types";
import type { Order, Store } from "./types";

/** Own PostgreSQL on the server (schema: db/schema.sql) + photos in the media folder. */

type Json = Parameters<ReturnType<typeof db>["json"]>[0];
const json = (v: unknown) => db().json(v as Json);

function invoicesOf(o: Order): string[] {
  const ids = new Set<string>();
  if (o.invoiceId) ids.add(o.invoiceId);
  for (const p of o.payments ?? []) ids.add(p.invoiceId);
  return [...ids];
}

async function linkInvoices(sql: postgres.TransactionSql, o: Order) {
  for (const inv of invoicesOf(o)) {
    await sql`insert into order_invoices (invoice_id, order_id) values (${inv}, ${o.id}) on conflict (invoice_id) do nothing`;
  }
}

export const pgStore: Store = {
  name: "pg",

  async listProducts() {
    const rows = await db()`select data from products order by id desc`;
    return rows.map((r) => r.data as Product);
  },

  async getProduct(id) {
    const [row] = await db()`select data from products where id = ${id}`;
    return (row?.data as Product) ?? null;
  },

  async saveProduct(product) {
    await db()`
      insert into products (id, slug, data, updated_at)
      values (${product.id}, ${product.slug}, ${json(product)}, now())
      on conflict (id) do update set slug = excluded.slug, data = excluded.data, updated_at = now()`;
    return product;
  },

  async deleteProduct(id) {
    await db()`delete from products where id = ${id}`;
  },

  async nextProductId() {
    const [row] = await db()`select coalesce(max(id), 0) + 1 as next from products`;
    return Number(row.next);
  },

  async uploadImage({ bytes, contentType, name }) {
    return { url: await saveUpload(bytes, contentType, name) };
  },

  async deleteImage(url) {
    await deleteUpload(url);
  },

  async listOrders() {
    const rows = await db()`select data from orders order by created_at desc`;
    return rows.map((r) => r.data as Order);
  },

  async getOrder(id) {
    const [row] = await db()`select data from orders where id = ${id}`;
    return (row?.data as Order) ?? null;
  },

  async getOrderByInvoice(invoiceId) {
    const [row] = await db()`
      select o.data from order_invoices i join orders o on o.id = i.order_id where i.invoice_id = ${invoiceId}`;
    return (row?.data as Order) ?? null;
  },

  async listOrdersForUser(userId, email) {
    const rows = await db()`
      select data from orders
      where (${userId || null}::text is not null and user_id = ${userId || null})
         or (${email || null}::text is not null and lower(email) = lower(${email || null}))
      order by created_at desc`;
    return rows.map((r) => r.data as Order);
  },

  async createOrder(order) {
    const row: Order = { ...order, version: 0 };
    await db().begin(async (sql) => {
      await sql`
        insert into orders (id, status, user_id, email, version, data, created_at)
        values (${order.id}, ${order.status}, ${order.userId ?? null}, ${order.customer.email ?? null}, 0, ${json(row)}, ${order.createdAt})`;
      await linkInvoices(sql, order);
    });
    return order;
  },

  async updateOrder(order, expectedVersion) {
    const row: Order = { ...order, version: expectedVersion + 1 };
    return db().begin(async (sql) => {
      const res = await sql`
        update orders
           set status = ${order.status}, user_id = ${order.userId ?? null}, email = ${order.customer.email ?? null},
               version = ${expectedVersion + 1}, data = ${json(row)}
         where id = ${order.id} and version = ${expectedVersion}`;
      if (res.count === 0) return false;
      await linkInvoices(sql, order);
      return true;
    });
  },
};
