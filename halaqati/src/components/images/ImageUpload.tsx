"use client";

import { useRef, useState, useTransition } from "react";
import { removeImageAction, setImageAction } from "@/app/dashboard/image-actions";
import { Alert, Button } from "@/components/ui";

/** Shrinks the picture in the browser (≤ 320px, WebP/JPEG) before it is stored. */
async function shrink(file: File, max = 320): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}

export function ImageUpload({
  type, id, current, label, round = true,
}: { type: "profile" | "center" | "organization"; id: string; current: string | null; label: string; round?: boolean }) {
  const [preview, setPreview] = useState(current);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif|heic|heif)$/.test(file.type) || file.size > 15_000_000) {
      setMsg({ tone: "error", text: "اختر صورة (PNG أو JPG أو WebP)." });
      return;
    }
    try {
      const data = await shrink(file);
      start(async () => {
        const res = await setImageAction(type, id, data);
        if (res.ok) setPreview(data);
        setMsg(res.ok ? { tone: "success", text: res.message ?? "تم" } : { tone: "error", text: res.error ?? "تعذّر الحفظ" });
      });
    } catch {
      setMsg({ tone: "error", text: "تعذّرت قراءة الصورة." });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className={`grid size-20 shrink-0 place-items-center overflow-hidden bg-deep text-muted ${round ? "rounded-full" : "rounded-[18px]"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview ? <img src={preview} alt={label} className="size-full object-cover" /> : <span className="text-xs">لا صورة</span>}
      </div>
      <div className="flex flex-col gap-2">
        <input ref={input} type="file" accept="image/*" className="sr-only" id={`img-${type}-${id}`} onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex flex-wrap gap-2">
          <label htmlFor={`img-${type}-${id}`} className="btn btn-secondary cursor-pointer">{pending ? "جارٍ الحفظ…" : preview ? "تغيير الصورة" : "رفع صورة"}</label>
          {preview && (
            <Button type="button" variant="ghost" disabled={pending} onClick={() => start(async () => {
              const res = await removeImageAction(type, id);
              if (res.ok) setPreview(null);
              setMsg(res.ok ? { tone: "success", text: res.message ?? "تم" } : { tone: "error", text: res.error ?? "تعذّر الحذف" });
            })}>حذف</Button>
          )}
        </div>
        <p className="text-xs text-muted">تُصغَّر الصورة تلقائيًا قبل الحفظ.</p>
      </div>
      {msg && <div className="w-full"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
    </div>
  );
}
