import "server-only";
import { promises as fs } from "fs";
import { contentTypeFor, resolveMedia } from "@/lib/media";

/** Serves a file from the media folder (used when Nginx is not in front, e.g. local development). */
export async function serveMedia(folder: "image" | "uploads", parts: string[], req: Request): Promise<Response> {
  const file = resolveMedia(folder, parts);
  const type = file ? contentTypeFor(file) : null;
  if (!file || !type) return new Response("Not found", { status: 404 });
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) return new Response("Not found", { status: 404 });
    const etag = `"${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}"`;
    const headers = {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
      "Last-Modified": stat.mtime.toUTCString(),
    };
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
    const body = await fs.readFile(file);
    return new Response(new Uint8Array(body), { headers: { ...headers, "Content-Length": String(body.length) } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
