import "server-only";
import type { Order, Store } from "./types";
import { orderVersion } from "./types";
import { fsStore } from "./fs";

let cached: Store | null = null;

/**
 * Picks the backend:
 *  DATABASE_URL            → own PostgreSQL (production server)
 *  SUPABASE_URL + key      → Supabase (the Vercel demo)
 *  nothing                 → local JSON files
 */
export async function getStore(): Promise<Store> {
  if (cached) return cached;
  if (process.env.DATABASE_URL) {
    const { pgStore } = await import("./pg");
    cached = pgStore;
  } else if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { supabaseStore } = await import("./supabase");
    cached = supabaseStore;
  } else {
    cached = fsStore;
  }
  return cached;
}

/**
 * Read-modify-write of an order that is safe against concurrent updates
 * (bank callback, customer's return page and admin can touch the same order at once).
 * `change` gets a fresh copy and returns the new order, or null to leave it as is.
 */
export async function mutateOrder(
  id: string,
  change: (order: Order) => Order | null | Promise<Order | null>,
): Promise<{ before: Order; after: Order; changed: boolean } | null> {
  const store = await getStore();
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = await store.getOrder(id);
    if (!current) return null;
    const next = await change(structuredClone(current));
    if (!next) return { before: current, after: current, changed: false };
    const v = orderVersion(current);
    if (await store.updateOrder(next, v)) return { before: current, after: { ...next, version: v + 1 }, changed: true };
    await new Promise((r) => setTimeout(r, 40 + attempt * 60));
  }
  throw new Error(`Order ${id}: too many concurrent updates`);
}

export type { Store, Order, OrderStatus, PaymentStatus, PaymentAttempt, HalykState } from "./types";
export { publicOrder } from "./types";
