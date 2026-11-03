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
    // Safari plays a video only when the server answers byte ranges.
    const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
      if (start > end || start >= stat.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      const fh = await fs.open(file, "r");
      try {
        const chunk = new Uint8Array(end - start + 1);
        await fh.read(chunk, 0, chunk.length, start);
        return new Response(chunk, {
          status: 206,
          headers: { ...headers, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(chunk.length) },
        });
      } finally {
        await fh.close();
      }
    }
    const body = await fs.readFile(file);
    return new Response(new Uint8Array(body), { headers: { ...headers, "Accept-Ranges": "bytes", "Content-Length": String(body.length) } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
