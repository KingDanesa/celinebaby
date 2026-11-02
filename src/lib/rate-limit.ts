import "server-only";
import { headers } from "next/headers";

/** Small in-memory limiter: the production site runs as one Node process, so this is enough against password guessing. */
const hits = new Map<string, number[]>();

export function tooMany(key: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  const from = now - windowSec * 1000;
  const list = (hits.get(key) ?? []).filter((t) => t > from);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => t > from)) hits.delete(k);
  return list.length > limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "local").trim();
}
