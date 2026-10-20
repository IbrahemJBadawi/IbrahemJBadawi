"use client";

import { getSupabase } from "@/lib/supabase/client";

let sent = 0;
let windowStart = Date.now();
const seen = new Set<string>();

/** يرسل الأخطاء الأساسية إلى جدول error_logs (بحد أقصى 5 أخطاء كل 10 دقائق، دون بيانات شخصية). */
export function reportError(err: unknown) {
  try {
    const supabase = getSupabase();
    if (!supabase || process.env.NODE_ENV !== "production") return;
    if (Date.now() - windowStart > 600_000) {
      windowStart = Date.now();
      sent = 0;
    }
    const message = (err instanceof Error ? err.message : String(err ?? "unknown")).slice(0, 2000);
    if (!message || seen.has(message) || sent >= 5) return;
    seen.add(message);
    sent++;
    const stack = err instanceof Error ? err.stack?.slice(0, 8000) : undefined;
    void supabase.from("error_logs").insert({
      message,
      stack,
      url: location.pathname.slice(0, 500),
      user_agent: navigator.userAgent.slice(0, 500),
    });
  } catch {
    /* لا شيء */
  }
}
