import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/storage";
import { withContext } from "@/lib/db/core";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

/** Serves uploaded images (local disk in development, the database when hosted). */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path: parts } = await ctx.params;
  const name = parts.join("/");
  // Only flat, generated file names: <uuid>.<ext>
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|avif)$/.test(name)) return new Response("Not found", { status: 404 });
  let data: Uint8Array | null = null;
  try {
    data = await fs.readFile(path.join(UPLOAD_DIR, name));
  } catch {
    const [row] = await withContext({ role: "system" }, (tx) =>
      tx.query<{ data: Uint8Array }>("select data from public.media_files where name = $1", [name]),
    ).catch(() => []);
    data = row?.data ?? null;
  }
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(data), {
    headers: {
      "Content-Type": MIME[name.split(".").pop()!],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
