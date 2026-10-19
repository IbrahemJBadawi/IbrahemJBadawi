import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "سياسة الخصوصية" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title="سياسة الخصوصية" description="نسخة أولية تحتاج مراجعة قانونية قبل الإطلاق العام." />
      <section>
        <h2 className="mb-1 text-xl font-bold text-brand-900">البيانات التي نجمعها</h2>
        <p>الاسم والبريد الإلكتروني وكلمة المرور (مشفّرة لدى مزوّد المصادقة)، وبيانات اختيارية: الجنس وسنة الميلاد والمدينة لأغراض توزيع الطلاب على الحلقات المناسبة فقط. لا نطلب عنوان السكن ولا رقم الهوية.</p>
      </section>
      <section>
        <h2 className="mb-1 text-xl font-bold text-brand-900">من يرى بياناتك</h2>
        <ul className="list-inside list-disc">
          <li>المحفّظ وفريق الحلقة التي انضممت إليها أو طلبت الانضمام إليها.</li>
          <li>إدارة المركز أو الدار التي تنتمي إليها.</li>
          <li>وليّ الأمر الذي ربطته بحسابك عبر رمز تمنحه أنت له.</li>
        </ul>
        <p className="mt-1">لا تُعرض بيانات الطلاب في الصفحات العامة، ولا يطّلع الكفلاء على بيانات الأطفال الشخصية.</p>
      </section>
      <section>
        <h2 className="mb-1 text-xl font-bold text-brand-900">سجل التدقيق</h2>
        <p>نسجّل العمليات الحساسة (منح الأدوار، تعديل السجلات المعتمدة، قرارات الانضمام) لحماية الطلاب والمؤسسات.</p>
      </section>
      <section>
        <h2 className="mb-1 text-xl font-bold text-brand-900">حقوقك</h2>
        <p>يمكنك من صفحة «حسابي» طلب نسخة من بياناتك أو حذف حسابك. تُراجع إدارة المنصة الطلب وتنفّذه، وتُحذف عند حذف الحساب سجلاتُ الطالب المرتبطة به.</p>
      </section>
      <section>
        <h2 className="mb-1 text-xl font-bold text-brand-900">الاحتفاظ بالبيانات</h2>
        <p>نحتفظ بالبيانات ما دام الحساب نشطًا. تُحذف سجلات حدود الاستخدام تلقائيًا بعد يومين، وتُحفظ سجلات التدقيق للمدة اللازمة للأمان والمساءلة.</p>
      </section>
    </article>
  );
}
