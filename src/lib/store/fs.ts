import { promises as fs } from "fs";
import path from "path";
import type { Product } from "@/lib/types";
import { orderVersion, type Order, type Store } from "./types";
import { deleteUpload, saveUpload } from "@/lib/media";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const SEED = path.join(DATA_DIR, "seed", "products.json");
const PRODUCTS = path.join(DATA_DIR, "products.json");
const ORDERS = path.join(DATA_DIR, "orders.json");

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(p: string, fallback: T): Promise<T> {
  if (!(await exists(p))) return fallback;
  const raw = await fs.readFile(p, "utf8");
  return raw.trim() ? (JSON.parse(raw) as T) : fallback;
}

async function writeJson(p: string, data: unknown) {
  await fs.mkdir(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 1), "utf8");
  await fs.rename(tmp, p);
}

// Serialise writes so concurrent server actions never clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

async function ensureProducts(): Promise<Product[]> {
  if (!(await exists(PRODUCTS))) {
    const seed = await readJson<Product[]>(SEED, []);
    await writeJson(PRODUCTS, seed);
    return seed;
  }
  return readJson<Product[]>(PRODUCTS, []);
}

export const fsStore: Store = {
  name: "fs",

  async listProducts() {
    return ensureProducts();
  },

  async getProduct(id) {
    const all = await ensureProducts();
    return all.find((p) => p.id === id) ?? null;
  },

  async saveProduct(product) {
    return locked(async () => {
      const all = await ensureProducts();
      const i = all.findIndex((p) => p.id === product.id);
      if (i >= 0) all[i] = product;
      else all.unshift(product);
      await writeJson(PRODUCTS, all);
      return product;
    });
  },

  async deleteProduct(id) {
    await locked(async () => {
      const all = await ensureProducts();
      await writeJson(
        PRODUCTS,
        all.filter((p) => p.id !== id),
      );
    });
  },

  async nextProductId() {
    const all = await ensureProducts();
    return all.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  },

  async uploadImage({ bytes, contentType, name }) {
    return { url: await saveUpload(bytes, contentType, name) };
  },

  async deleteImage(url) {
    await deleteUpload(url);
  },

  async listOrders() {
    const orders = await readJson<Order[]>(ORDERS, []);
    return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getOrder(id) {
    const orders = await readJson<Order[]>(ORDERS, []);
    return orders.find((o) => o.id === id) ?? null;
  },

  async getOrderByInvoice(invoiceId) {
    const orders = await readJson<Order[]>(ORDERS, []);
    return orders.find((o) => o.invoiceId === invoiceId || o.payments?.some((p) => p.invoiceId === invoiceId)) ?? null;
  },

  async listOrdersForUser(userId, email) {
    const orders = await readJson<Order[]>(ORDERS, []);
    return orders
      .filter((o) => (userId && o.userId === userId) || (email && o.customer.email?.toLowerCase() === email.toLowerCase()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createOrder(order) {
    return locked(async () => {
      const orders = await readJson<Order[]>(ORDERS, []);
      if (orders.some((o) => o.id === order.id)) throw new Error(`Order ${order.id} already exists`);
      orders.push({ ...order, version: 0 });
      await writeJson(ORDERS, orders);
      return order;
    });
  },

  async updateOrder(order, expectedVersion) {
    return locked(async () => {
      const orders = await readJson<Order[]>(ORDERS, []);
      const i = orders.findIndex((o) => o.id === order.id);
      if (i < 0 || orderVersion(orders[i]) !== expectedVersion) return false;
      orders[i] = { ...order, version: expectedVersion + 1 };
      await writeJson(ORDERS, orders);
      return true;
    });
  },
};
