import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "ثبّت حلقتي كتطبيق" };

export default function InstallAppPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PageHeader title="ثبّت حلقتي على هاتفك" description="مجانًا، دون متجر تطبيقات، ويعمل بحجم صغير مناسب للإنترنت المحدود." />
      <Card>
        <h2 className="mb-2 text-lg font-bold text-brand-800">على Android (Chrome)</h2>
        <ol className="list-inside list-decimal space-y-1">
          <li>افتح حلقتي في متصفح Chrome.</li>
          <li>اضغط زر «تثبيت» في البطاقة أسفل الصفحة، أو من قائمة ⋮ اختر «تثبيت التطبيق».</li>
          <li>ستجد أيقونة حلقتي على الشاشة الرئيسية.</li>
        </ol>
      </Card>
      <Card>
        <h2 className="mb-2 text-lg font-bold text-brand-800">على iPhone (Safari)</h2>
        <ol className="list-inside list-decimal space-y-1">
          <li>افتح حلقتي في Safari.</li>
          <li>اضغط زر المشاركة ⬆︎ ثم «إضافة إلى الشاشة الرئيسية».</li>
        </ol>
      </Card>
      <Card>
        <h2 className="mb-2 text-lg font-bold text-brand-800">دون اتصال</h2>
        <p className="text-muted">الصفحات العامة التي فتحتها سابقًا تفتح دون إنترنت. أما بيانات حسابك (التسميع والحضور) فلا تُحفظ على الجهاز حمايةً للخصوصية، خاصة على الأجهزة المشتركة في العائلة.</p>
      </Card>
    </div>
  );
}
