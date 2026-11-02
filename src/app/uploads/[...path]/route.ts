import { serveMedia } from "@/lib/media-route";

export const runtime = "nodejs";

/** Photos uploaded in the admin. */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return serveMedia("uploads", path, req);
}
