import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "unsupported type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const store = await getStore();
  const { url } = await store.uploadImage({ bytes, contentType: file.type, name: file.name.replace(/\.[^.]+$/, "") });
  return NextResponse.json({ url });
}
