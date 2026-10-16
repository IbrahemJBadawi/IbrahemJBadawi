import type { Metadata } from "next";
import Link from "next/link";
import { setLeagueVisibilityAction } from "@/app/dashboard/motivation-actions";
import { InstallButton, ThemeToggle } from "@/components/layout/AppChrome";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { PushToggle } from "./PushToggle";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: devices }] = await Promise.all([
    supabase.from("profiles").select("league_visible").eq("id", user.id).single(),
    supabase.from("push_subscriptions").select("id, user_agent, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
  ]);
  const visible = profile?.league_visible ?? true;
  return (
    <>
      <PageHeader title="الإعدادات" />
      <div className="flex flex-col gap-4">
        <Card id="push">
          <h2 className="mb-1 font-bold text-brand-800">إشعارات الجهاز</h2>
          <p className="mb-3 text-sm text-muted">تصلك تنبيهات الجلسات والواجبات والتقييمات والتفاعلات حتى والمنصة مغلقة.</p>
          <PushToggle />
          {(devices ?? []).length > 0 && (
            <p className="mt-3 text-sm text-muted">الأجهزة المفعّلة: {(devices ?? []).length} · آخرها منذ {formatDate((devices ?? [])[0].created_at)}</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 font-bold text-brand-800">تثبيت التطبيق</h2>
          <p className="mb-3 text-sm text-muted">ثبّت حلقتي على الشاشة الرئيسية ليفتح كتطبيق مستقل وأسرع، دون متجر تطبيقات.</p>
          <div className="flex flex-wrap items-center gap-3">
            <InstallButton className="btn btn-primary" />
            <Link href="/app" className="text-sm font-semibold text-brand-800 underline">طريقة التثبيت على كل جهاز</Link>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 font-bold text-brand-800">المظهر</h2>
          <p className="mb-3 text-sm text-muted">يُحفظ اختيارك على هذا الجهاز.</p>
          <ThemeToggle withLabel />
        </Card>

        {user.roles.includes("student") && (
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-brand-800">الخصوصية في الدوري</h2>
              <p className="text-sm text-muted">{visible ? "يظهر اسمك لزملائك في ترتيب الحلقة." : "يظهر اسمك «مشارك» لزملائك. المعلّم ووليّ أمرك يرونه دائمًا."}</p>
            </div>
            <form action={setLeagueVisibilityAction}>
              <input type="hidden" name="visible" value={visible ? "0" : "1"} />
              <Button type="submit" variant="secondary">{visible ? "إخفاء اسمي" : "إظهار اسمي"}</Button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
