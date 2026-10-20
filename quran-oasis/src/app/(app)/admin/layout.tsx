import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "لوحة الإدارة", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * حماية لوحة الإدارة على الخادم: يُتحقق من المستخدم عبر Supabase Auth ومن دوره في قاعدة البيانات.
 * وحتى لو تجاوز أحد هذه الصفحة، فكل عمليات الكتابة محمية بسياسات RLS ودوال تتحقق من الدور.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-xl rounded-[var(--radius-card)] border border-line bg-surface p-6 text-center">
        <h1 className="text-xl font-bold">لوحة الإدارة غير مفعّلة</h1>
        <p className="mt-2 text-sm text-muted">تحتاج لوحة الإدارة إلى ربط Supabase. راجع ملف README لإعداد قاعدة البيانات وإنشاء حساب المدير.</p>
      </div>
    );
  }
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "editor")) notFound();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
        <span className="rounded-full bg-gold-soft px-3 py-1 text-xs font-bold text-gold-fg">{profile.role === "admin" ? "مدير" : "محرر محتوى"}</span>
      </div>
      <AdminNav role={profile.role} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
