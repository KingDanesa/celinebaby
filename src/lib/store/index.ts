import "server-only";
import type { Store } from "./types";
import { fsStore } from "./fs";

let cached: Store | null = null;

/** Picks the backend: Supabase when its env vars are set, local files otherwise. */
export async function getStore(): Promise<Store> {
  if (cached) return cached;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { supabaseStore } = await import("./supabase");
    cached = supabaseStore;
  } else {
    cached = fsStore;
  }
  return cached;
}

export type { Store, Order, OrderStatus } from "./types";
