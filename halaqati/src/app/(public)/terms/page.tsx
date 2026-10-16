import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "شروط الاستخدام" };

export default function TermsPage() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title="شروط الاستخدام" description="نسخة أولية تحتاج مراجعة قانونية قبل الإطلاق العام." />
      <ul className="list-inside list-disc space-y-2">
        <li>يلتزم المستخدم بتقديم معلومات صحيحة وعدم انتحال صفة غيره.</li>
        <li>يتحمّل المحفّظ مسؤولية محتوى حلقته وروابط اللقاءات التي يضيفها.</li>
        <li>يُمنع نشر عناوين السكن أو أي بيانات شخصية للأطفال في الأوصاف العامة.</li>
        <li>يجب أن يكون استخدام القاصرين بإشراف وليّ الأمر.</li>
        <li>يحق لإدارة المنصة إيقاف الحسابات أو الحلقات المخالفة بعد المراجعة.</li>
        <li>الخدمات الأساسية مجانية حاليًا، وأي خدمة مدفوعة ستُعلن شروطها بوضوح قبل تفعيلها.</li>
      </ul>
    </article>
  );
}
