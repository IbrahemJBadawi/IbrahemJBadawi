import { ButtonLink, Card } from "@/components/ui";

const AUDIENCES = [
  { title: "للطالب", text: "خطة حفظ ومراجعة واضحة، وسجلّ لكل تسميع، ومتابعة للحضور والواجب القادم." },
  { title: "للمحفّظ", text: "أنشئ حلقتك المستقلة، واستقبل طلبات الانضمام، وسجّل الحضور والتسميع والأخطاء في دقائق." },
  { title: "لولي الأمر", text: "تابع تقدّم أبنائك بعد ربطٍ آمن يوافق عليه الطالب، دون الاطلاع على بيانات غيرهم." },
  { title: "للدور والمراكز", text: "إدارة الفروع والحلقات والمحفّظين مع عزلٍ تام لبيانات كل مؤسسة." },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-2xl bg-brand-800 px-5 py-10 text-white sm:px-10 sm:py-14">
        <p className="mb-2 font-semibold text-gold">رحلتك مع القرآن</p>
        <h1 className="text-3xl font-bold leading-snug sm:text-4xl">حلقتي: منصة واحدة لحلقات التحفيظ والمراجعة</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/90">
          تربط الطلاب بالمحفّظين، وتساعد الدور والمراكز على متابعة رحلة كل طالب: الحفظ الجديد، والمراجعة القريبة والبعيدة، والحضور، وجودة التلاوة.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/halaqat" className="bg-white !text-brand-900 hover:bg-ivory">استعرض الحلقات</ButtonLink>
          <ButtonLink href="/register" variant="secondary" className="!border-white/60 !bg-transparent !text-white hover:!bg-white/10">أنشئ حسابك مجانًا</ButtonLink>
        </div>
      </section>

      <section aria-labelledby="who">
        <h2 id="who" className="mb-4 text-2xl font-bold text-brand-900">لمن حلقتي؟</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <Card key={a.title}>
              <h3 className="mb-1 text-lg font-bold text-brand-800">{a.title}</h3>
              <p className="text-muted">{a.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="measure" className="rounded-2xl border border-line bg-white p-5 sm:p-8">
        <h2 id="measure" className="mb-3 text-2xl font-bold text-brand-900">نقيس الإتقان لا عدد الصفحات فقط</h2>
        <p className="text-muted">
          يسجّل المحفّظ لكل تسميع خمسة مؤشرات منفصلة: مقدار الحفظ، وإتقانه، وجودة التلاوة، والالتزام بالخطة، والحضور — مع الأخطاء الملحوظة والواجب القادم.
          السجل المعتمد لا يُعدَّل إلا بسبب موثّق.
        </p>
      </section>
    </div>
  );
}
