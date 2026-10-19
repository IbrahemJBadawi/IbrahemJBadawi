import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "عن حلقتي" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="عن حلقتي" description="رحلتك مع القرآن" />
      <div className="flex flex-col gap-4 text-lg">
        <p>حلقتي منظومة رقمية تخدم حلقات تحفيظ القرآن الكريم وتعليمه: للطالب والمحفّظ ووليّ الأمر، وللدور والمراكز وفروعها.</p>
        <p>يمكن للمحفّظ أن يعمل مستقلًا دون الانتماء لأي مركز، ويمكن للطالب أن يتعلّم في حلقة مستقلة أو تابعة لمؤسسة.</p>
        <Card>
          <h2 className="mb-2 text-xl font-bold text-brand-900">مبادئنا</h2>
          <ul className="list-inside list-disc space-y-1 text-base">
            <li>خصوصية الطلاب — وخاصة الأطفال — أولوية لا تُساوَم.</li>
            <li>لا يرى أحد بيانات طالب إلا من له علاقة موثّقة به.</li>
            <li>السجلات المعتمدة لا تُعدَّل إلا بسبب مكتوب ومحفوظ.</li>
            <li>الحسابات الأساسية للطلاب والحلقات المستقلة مجانية.</li>
          </ul>
        </Card>
        <Card>
          <h2 className="mb-2 text-xl font-bold text-brand-900">ما المتاح الآن</h2>
          <p className="text-base text-muted">
            الإصدار الحالي يشمل الحسابات والأدوار، والحلقات وطلبات الانضمام، والجلسات والحضور، وسجل الحفظ والمراجعة والأخطاء والواجبات، وربط أولياء الأمور.
            إدارة الدور والمراكز التفصيلية والدورات التعليمية والكفالة قيد التطوير وستُعلن عند جاهزيتها.
          </p>
        </Card>
      </div>
    </div>
  );
}
