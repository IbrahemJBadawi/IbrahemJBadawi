import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Image storage for product photos.
 *  - Supabase configured (URL + SUPABASE_SERVICE_ROLE_KEY): public bucket in Supabase Storage.
 *  - Otherwise: local folder .data/uploads served by /media/* (development only —
 *    serverless hosts such as Vercel have no persistent disk).
 */
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { ext: "webp", magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
  "image/avif": { ext: "avif", magic: (b) => b.subarray(4, 12).toString().startsWith("ftypavi") },
};

export const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export function storageMode(): "supabase" | "local" {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local";
}

export async function uploadImage(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "الملف فارغ." };
  if (file.size > MAX_BYTES) return { ok: false, error: "حجم الصورة يتجاوز 5 ميغابايت." };
  const type = TYPES[file.type];
  const buf = Buffer.from(await file.arrayBuffer());
  // Trust the bytes, not the browser-provided MIME type.
  if (!type || !type.magic(buf)) return { ok: false, error: "صيغة غير مدعومة. استخدم JPG أو PNG أو WEBP أو AVIF." };
  const name = `${randomUUID()}.${type.ext}`;

  if (storageMode() === "supabase") {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
    const res = await fetch(`${base}/storage/v1/object/${bucket}/products/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": file.type,
        "Cache-Control": "31536000",
      },
      body: buf,
    });
    if (!res.ok) return { ok: false, error: "تعذّر رفع الصورة إلى Supabase Storage. تأكد من إنشاء الحاوية (bucket) وجعلها عامة." };
    return { ok: true, url: `${base}/storage/v1/object/public/${bucket}/products/${name}` };
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  return { ok: true, url: `/media/${name}` };
}
