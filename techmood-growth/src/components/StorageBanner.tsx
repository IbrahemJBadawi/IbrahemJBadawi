import { storageMode } from "@/lib/db/core";

/** Honest notice when data is not persistent (serverless host without a database). */
export function StorageBanner() {
  if (storageMode() !== "demo") return null;
  return (
    <div role="status" className="tone-amber px-4 py-2 text-center text-[0.85rem] font-semibold">
      وضع التجربة: هذه النسخة تعمل بتخزين مؤقت على الخادم وقد تُمسح بياناتها في أي وقت. لا تُدخل بيانات عملاء حقيقية حتى يُربط Postgres/Supabase.
    </div>
  );
}
