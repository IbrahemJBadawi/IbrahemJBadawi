import { Crescent, Skyline } from "@/components/brand/Skyline";
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
      <section className="dawn px-6 pt-10 pb-24 text-center sm:px-10 sm:pt-14 sm:pb-32">
        <Skyline />
        <Crescent className="mx-auto mb-3 size-10 text-gold" />
        <p className="mb-2 font-semibold text-gold-dark">رحلتك مع القرآن</p>
        <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-snug text-brand-900 sm:text-4xl">حلقتي: منصة واحدة لحلقات التحفيظ والمراجعة</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          تربط الطلاب بالمحفّظين، وتساعد الدور والمراكز على متابعة رحلة كل طالب: الحفظ الجديد، والمراجعة القريبة والبعيدة، والحضور، وجودة التلاوة.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/register">أنشئ حسابك مجانًا</ButtonLink>
          <ButtonLink href="/halaqat" variant="secondary">استعرض الحلقات</ButtonLink>
        </div>
      </section>

      <section aria-labelledby="motivate" className="grid gap-4 sm:grid-cols-3">
        <h2 id="motivate" className="sr-only">ما يحفّز الطالب</h2>
        {[
          { tint: "t-peach", icon: "🔥", title: "الحماسة", text: "سلسلة أيام متتالية من الورد والتسميع والمهام." },
          { tint: "t-sand", icon: "🏆", title: "دوري الحلقة", text: "ترتيب أسبوعي بالنقاط داخل الحلقة، مع خيار إخفاء الاسم." },
          { tint: "t-sky", icon: "📈", title: "إحصائيات واضحة", text: "رسوم أسبوعية للحفظ والمراجعة والإتقان والحضور." },
        ].map((f) => (
          <Card key={f.title} className="flex items-start gap-3">
            <span className={`tile-icon ${f.tint} !size-12 !rounded-[16px] text-2xl`} aria-hidden>{f.icon}</span>
            <div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="text-sm text-muted">{f.text}</p>
            </div>
          </Card>
        ))}
      </section>

      <section aria-labelledby="who">
        <h2 id="who" className="mb-4 text-2xl font-bold text-ink">لمن حلقتي؟</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <Card key={a.title}>
              <h3 className="mb-1 text-lg font-bold text-brand-800">{a.title}</h3>
              <p className="text-muted">{a.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="measure" className="surface p-5 sm:p-8">
        <h2 id="measure" className="mb-3 text-2xl font-bold text-ink">نقيس الإتقان لا عدد الصفحات فقط</h2>
        <p className="text-muted">
          يسجّل المحفّظ لكل تسميع خمسة مؤشرات منفصلة: مقدار الحفظ، وإتقانه، وجودة التلاوة، والالتزام بالخطة، والحضور — مع الأخطاء الملحوظة والواجب القادم.
          السجل المعتمد لا يُعدَّل إلا بسبب موثّق.
        </p>
      </section>
    </div>
  );
}
