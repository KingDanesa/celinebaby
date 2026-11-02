import { serveMedia } from "@/lib/media-route";

export const runtime = "nodejs";

/** Photos moved from the old site, same URLs as celinebaby.kz/image/... */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return serveMedia("image", path, req);
}
