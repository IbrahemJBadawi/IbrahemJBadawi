import { Crescent, Skyline } from "@/components/brand/Skyline";
import { ButtonLink, Card } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icon";

const AUDIENCES = [
  { title: "للطالب", text: "خطة حفظ ومراجعة واضحة، وسجلّ لكل تسميع، ومتابعة للحضور والواجب القادم." },
  { title: "للمحفّظ", text: "أنشئ حلقتك المستقلة، واستقبل طلبات الانضمام، وسجّل الحضور والتسميع والأخطاء في دقائق." },
  { title: "لولي الأمر", text: "تابع تقدّم أبنائك بعد ربطٍ آمن يوافق عليه الطالب، دون الاطلاع على بيانات غيرهم." },
  { title: "للدور والمراكز", text: "إدارة الفروع والحلقات والمحفّظين مع عزلٍ تام لبيانات كل مؤسسة." },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">

      <section className="dawn landing-hero" aria-labelledby="landing-title">
        <Skyline />
        <div className="landing-copy">
          <span className="landing-eyebrow"><Crescent className="size-5" /> رحلتك مع القرآن، خطوة بخطوة</span>
          <h1 id="landing-title">كل حلقة، كل طالب، <span className="landing-gradient">كل إنجاز في مكان واحد.</span></h1>
          <p className="landing-lead">حلقتي تجمع إدارة حلقات القرآن ومتابعة الحفظ والمراجعة والحضور في تجربة واضحة للمعلم والطالب وولي الأمر والمركز.</p>
          <div className="landing-actions">
            <ButtonLink href="/register">ابدأ رحلتك مجانًا <Icon name="chevron" size={18} /></ButtonLink>
            <ButtonLink href="/halaqat" variant="secondary"><Icon name="search" size={18} /> استعرض الحلقات</ButtonLink>
          </div>
          <div className="landing-trust">
            <span><Icon name="checkCircle" size={17} /> متابعة الحفظ والمراجعة</span>
            <span><Icon name="shield" size={17} /> خصوصية لكل طالب</span>
            <span><Icon name="users" size={17} /> للطلاب والمراكز</span>
          </div>
        </div>
        <div className="landing-showcase" aria-label="نظرة على أدوات المنصة">
          <div className="landing-window">
            <div className="landing-window-head">
              <span className="landing-window-logo"><Icon name="bookOpen" size={22} /></span>
              <div><strong>رحلتي القرآنية</strong><small>كل خطوة في طريق الإتقان</small></div>
              <span className="landing-window-status"><Icon name="checkCircle" size={14} /> متابعة يومية</span>
            </div>
            <div className="landing-window-grid">
              <div className="landing-mini-card"><span className="landing-mini-icon mint"><Icon name="bookOpen" /></span><strong>الحفظ الجديد</strong><small>تسميع ومقدار وإتقان</small></div>
              <div className="landing-mini-card"><span className="landing-mini-icon sand"><Icon name="refresh" /></span><strong>المراجعة</strong><small>قريبة وبعيدة ومنظمة</small></div>
              <div className="landing-mini-card"><span className="landing-mini-icon sky"><Icon name="calendar" /></span><strong>الحضور</strong><small>الجلسات وجدول الحلقة</small></div>
              <div className="landing-mini-card"><span className="landing-mini-icon rose"><Icon name="chartUp" /></span><strong>التقدّم</strong><small>إحصائيات لكل طالب</small></div>
            </div>
            <div className="landing-window-footer"><Icon name="star" size={18} /><span>حماسة يومية وإنجازات تشجّع على الاستمرار</span></div>
          </div>
          <span className="landing-orbit landing-orbit-one" aria-hidden><Icon name="sparkles" size={24} /></span>
          <span className="landing-orbit landing-orbit-two" aria-hidden><Icon name="trophy" size={24} /></span>
        </div>
      </section>


      <section aria-labelledby="motivate" className="landing-features">
        <div className="landing-section-heading"><span>تعلم مستمر</span><h2 id="motivate">التشجيع جزء من التجربة</h2><p>أدوات تحفيزية خفيفة تساعد الطالب على المواظبة، دون أن تطغى على هدف الحفظ والإتقان.</p></div>
        <div className="landing-feature-grid">
          {([
            { tint: "peach", icon: "flame", title: "الحماسة اليومية", text: "سلسلة أيام متتالية من الورد والتسميع والمهام." },
            { tint: "sand", icon: "trophy", title: "دوري الحلقة", text: "ترتيب بالنقاط داخل الحلقة، مع احترام خصوصية الطلاب." },
            { tint: "sky", icon: "chartUp", title: "تقدّم مرئي", text: "رسوم واضحة للحفظ والمراجعة والإتقان والحضور." },
          ] satisfies Array<{tint: string; icon: IconName; title: string; text: string}>).map((f) => (
            <Card key={f.title} className="landing-feature">
              <span className={"landing-feature-icon " + f.tint}><Icon name={f.icon} size={25} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="who">
        <div className="landing-section-heading mb-5"><span>لمن صُممت المنصة؟</span><h2 id="who">مكان واحد لكل من يرافق رحلة القرآن</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {AUDIENCES.map((a) => (
            <Card key={a.title} className="landing-audience-card">
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
