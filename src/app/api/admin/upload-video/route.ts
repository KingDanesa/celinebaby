import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { isAdmin } from "@/lib/admin/auth";
import { mediaDir } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Phone videos are big; after conversion a 20-second clip is usually 3–8 MB. */
const MAX_BYTES = 200 * 1024 * 1024;
const MAX_SECONDS = 30;
const TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.env.FFMPEG_PATH || "ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err || `ffmpeg exited with ${code}`))));
  });
}

/**
 * A home page video: converted to a light H.264 MP4 that plays everywhere (iPhone .mov/HEVC included),
 * without sound, at most 1280 px wide and 30 seconds long, plus a poster from the first frame.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (!TYPES.includes(file.type) && !/\.(mp4|mov|m4v|webm)$/i.test(file.name)) return NextResponse.json({ error: "unsupported type" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });

  const dir = path.join(mediaDir(), "uploads");
  const tmpDir = path.join(mediaDir(), "tmp");
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-video`;
  const input = path.join(tmpDir, `${id}${path.extname(file.name).toLowerCase() || ".mp4"}`);
  const out = path.join(dir, `${id}.mp4`);
  const poster = path.join(dir, `${id}.jpg`);
  await fs.writeFile(input, new Uint8Array(await file.arrayBuffer()));
  try {
    await run([
      "-y", "-i", input, "-t", String(MAX_SECONDS), "-an",
      "-vf", "scale='min(1280,iw)':-2:flags=lanczos,format=yuv420p",
      "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-profile:v", "high",
      "-movflags", "+faststart", out,
    ]);
    await run(["-y", "-ss", "0.3", "-i", out, "-frames:v", "1", "-q:v", "3", poster]);
  } catch (e) {
    await fs.unlink(out).catch(() => {});
    console.error("video conversion failed", e);
    const missing = (e as NodeJS.ErrnoException)?.code === "ENOENT";
    return NextResponse.json({ error: missing ? "no ffmpeg" : "convert failed" }, { status: 500 });
  } finally {
    await fs.unlink(input).catch(() => {});
  }
  return NextResponse.json({ url: `/uploads/${id}.mp4`, poster: `/uploads/${id}.jpg` });
}
