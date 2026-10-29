import { promises as fs } from "fs";
import path from "path";
import type { Product } from "@/lib/types";
import type { Order, Store } from "./types";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const SEED = path.join(DATA_DIR, "seed", "products.json");
const PRODUCTS = path.join(DATA_DIR, "products.json");
const ORDERS = path.join(DATA_DIR, "orders.json");
const UPLOADS = path.join(ROOT, "public", "uploads");

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
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const safe = name.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "img";
    const file = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}.${ext}`;
    await fs.mkdir(UPLOADS, { recursive: true });
    await fs.writeFile(path.join(UPLOADS, file), bytes);
    return { url: `/uploads/${file}` };
  },

  async deleteImage(url) {
    if (!url.startsWith("/uploads/")) return;
    const p = path.join(UPLOADS, path.basename(url));
    if (await exists(p)) await fs.unlink(p);
  },

  async listOrders() {
    const orders = await readJson<Order[]>(ORDERS, []);
    return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getOrder(id) {
    const orders = await readJson<Order[]>(ORDERS, []);
    return orders.find((o) => o.id === id) ?? null;
  },

  async saveOrder(order) {
    return locked(async () => {
      const orders = await readJson<Order[]>(ORDERS, []);
      const i = orders.findIndex((o) => o.id === order.id);
      if (i >= 0) orders[i] = order;
      else orders.push(order);
      await writeJson(ORDERS, orders);
      return order;
    });
  },
};
