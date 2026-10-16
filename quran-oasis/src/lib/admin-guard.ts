import "server-only";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/server";

/** صفحات خاصة بالمدير فقط (المستخدمون، سجل الأخطاء). */
export async function requireAdmin() {
  const p = await getCurrentProfile();
  if (!p || p.role !== "admin") notFound();
  return p;
}
