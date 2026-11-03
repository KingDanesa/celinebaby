import "server-only";
import { promises as fs } from "fs";
import path from "path";

/**
 * Media folder on the server's disk:
 *   <MEDIA_DIR>/image/...   photos moved from the old site, same paths as celinebaby.kz/image/...
 *   <MEDIA_DIR>/uploads/... photos uploaded in the admin
 * In production Nginx serves both folders directly; the app's own routes are a fallback.
 */
export function mediaDir(): string {
  return path.resolve(process.env.MEDIA_DIR || path.join(process.cwd(), "media"));
}

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
};

export function contentTypeFor(file: string): string | null {
  return TYPES[path.extname(file).toLowerCase()] ?? null;
}

/** Resolves a URL path inside a media sub-folder, refusing anything that escapes it. */
export function resolveMedia(folder: "image" | "uploads", parts: string[]): string | null {
  const root = path.join(mediaDir(), folder);
  const target = path.resolve(root, ...parts);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

export async function saveUpload(bytes: Uint8Array, contentType: string, name: string): Promise<string> {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const safe = name.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "img";
  const file = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}.${ext}`;
  const dir = path.join(mediaDir(), "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, file), bytes);
  return `/uploads/${file}`;
}

export async function deleteUpload(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;
  const p = resolveMedia("uploads", [path.basename(url)]);
  if (!p) return;
  await fs.unlink(p).catch(() => {});
}
