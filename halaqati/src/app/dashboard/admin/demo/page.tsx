import type { Metadata } from "next";
import { purgeDemoAction, seedDemoAction } from "@/app/dashboard/community-actions";
import { Alert, Button, Card, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "البيانات التجريبية" };

export default async function DemoPage({ searchParams }: PageProps<"/dashboard/admin/demo">) {
  await requireContext("platform_admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_demo_status");
  const s = data as { users: number; halaqat: number; seeded_at: string | null; ready?: boolean } | null;
  const active = (s?.users ?? 0) > 0;
  return (
    <>
      <PageHeader title="البيانات التجريبية" description="مستخدمون وحلقات تجريبية تتفاعل معك لتجربة المنصة، وتُحذف كلها بضغطة واحدة." />
      <div className="flex flex-col gap-4">
        {sp.seeded && <Alert tone="success">أُنشئت البيانات التجريبية. افتح الرئيسية بدور «طالب» أو «محفّظ» أو «ولي أمر» لتجربتها.</Alert>}
        {sp.purged && <Alert tone="success">حُذفت كل البيانات التجريبية.</Alert>}
        {typeof sp.error === "string" && <Alert tone="error">{sp.error}</Alert>}
        <Card>
          <h2 className="mb-2 font-bold text-brand-800">ماذا تُنشئ؟</h2>
          <ul className="list-inside list-disc space-y-1 text-muted">
            <li>محفّظ تجريبي و8 طلاب ووليّ أمر، وكل أسمائهم تنتهي بـ«(تجريبي)»، ولا يمكنهم تسجيل الدخول.</li>
            <li>«حلقة الفجر (تجريبية)»: أنت طالب فيها، مع جلسات ثلاثة أسابيع وحضور وتسميعات ونقاط ودوري ورسائل وواجب وشهادة وتفاعلات من المحفّظ.</li>
            <li>«حلقة المراجعة (تجريبية)»: أنت محفّظها، فيها 6 طلاب وطلب انضمام بانتظارك.</li>
            <li>ربطك كوليّ أمر بطالبة تجريبية لتجربة لوحة وليّ الأمر.</li>
            <li>الحلقات التجريبية لا تظهر في دليل الحلقات العام.</li>
          </ul>
        </Card>
        <Card className="flex flex-col gap-3">
          <p>الحالة: {active ? <strong className="text-brand-800">مفعّلة — {s?.users} مستخدمًا و{s?.halaqat} حلقة{s?.seeded_at ? ` · منذ ${formatDateTime(s.seeded_at)}` : ""}</strong> : <strong>غير موجودة</strong>}</p>
          {active ? (
            <form action={purgeDemoAction} className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2"><input type="checkbox" name="confirm" className="size-5" required /> أؤكد حذف كل البيانات التجريبية</label>
              <Button type="submit" variant="danger">حذف البيانات التجريبية</Button>
            </form>
          ) : s?.ready === false ? (
            <Alert tone="warning">الإنشاء متوقف حتى تُثبَّت وظيفة الحذف على قاعدة البيانات، كي لا تُنشأ بيانات لا يمكن إزالتها.</Alert>
          ) : (
            <form action={seedDemoAction}><Button type="submit">إنشاء البيانات التجريبية</Button></form>
          )}
          <p className="text-sm text-muted">الحذف يزيل المستخدمين والحلقات التجريبية وكل ما يتبعها (التسميعات، النقاط، الشهادات، الرسائل، الإشعارات)، ولا يمسّ أي بيانات حقيقية.</p>
        </Card>
      </div>
    </>
  );
}
