import Link from "next/link";
import { BellRing, CalendarCheck2, ClipboardList, KanbanSquare, LineChart, ShieldCheck, Sparkles, Smartphone } from "lucide-react";
import { ButtonLink } from "@/components/ui";

const STEPS = [
  { t: "انشر نموذجك", d: "صفحة استقبال برابط خاص لإعلاناتك وحساباتك، بأسئلة تأهيل تختارها." },
  { t: "تابع كل عميل", d: "يدخل الطلب مباشرة إلى لوحة المراحل مع مصدره وحملته، وتصلك إشعارًا فوريًا." },
  { t: "احجز وحوّل", d: "رابط حجز يمنع التعارض، وتقارير تبيّن أي مصدر يجلب عملاء فعليين." },
];

const FEATURES = [
  { icon: ClipboardList, tone: "tone-blue", t: "نماذج وصفحات استقبال", d: "منشئ بسيط، حقول مطلوبة، أسئلة تأهيل، وموافقة واضحة على الخصوصية." },
  { icon: KanbanSquare, tone: "tone-violet", t: "CRM بمراحل مرنة", d: "من «جديد» حتى «تحوّل إلى عميل»، مع ملاحظات ومتابعات وسجل كامل." },
  { icon: CalendarCheck2, tone: "tone-green", t: "مواعيد بلا تعارض", d: "أوقات عمل بمنطقتك الزمنية، رابط حجز عام، وتأكيد وتذكير بالبريد." },
  { icon: LineChart, tone: "tone-sky", t: "تقارير حقيقية", d: "المصادر والحملات ومعدلات التحويل محسوبة من بياناتك فقط." },
  { icon: Sparkles, tone: "tone-pink", t: "مساعد ذكي", d: "مسودات رسائل متابعة وملخصات — تراجعها أنت قبل أي إرسال." },
  { icon: BellRing, tone: "tone-amber", t: "إشعارات فورية", d: "تنبيه على جوالك عند كل طلب أو حجز جديد، حتى والتطبيق مغلق." },
];

export default function Home() {
  return (
    <>
      <section className="public-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="badge tone-blue">لمراكز التدريب والشركات الخدمية</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              حوّل الاستفسارات إلى <span className="grad-text">عملاء حقيقيين</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              TechMood Growth يجمع نماذج الاستقبال وإدارة العملاء المحتملين والمواعيد والتقارير في منصة عربية واحدة تعمل بسلاسة على جوالك.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/register">ابدأ مجانًا</ButtonLink>
              <ButtonLink href="/features" variant="secondary">اكتشف المزايا</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">خطة مجانية دائمًا • تجربة Growth لمدة 14 يومًا • بدون بطاقة</p>
          </div>
          <div className="mx-auto w-full max-w-[340px]" aria-hidden>
            <div className="phone-frame p-4">
              <div className="hero-card">
                <p className="text-sm opacity-90">مرحبًا 👋</p>
                <p className="mt-1 text-xl font-extrabold">جاهز لمتابعة عملائك؟</p>
                <div className="mt-3 flex gap-2 text-xs">
                  <span className="rounded-full bg-white/20 px-3 py-1">اليوم</span>
                  <span className="rounded-full bg-white/20 px-3 py-1">هذا الأسبوع</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="tile tone-green"><span className="tile-value">12</span><span className="tile-label">عملاء جدد</span></div>
                <div className="tile tone-pink"><span className="tile-value">7</span><span className="tile-label">متابعات اليوم</span></div>
                <div className="tile tone-blue"><span className="tile-value">5</span><span className="tile-label">مواعيد</span></div>
                <div className="tile tone-amber"><span className="tile-value">18%</span><span className="tile-label">معدل التحويل</span></div>
              </div>
              <p className="mt-3 text-center text-[0.7rem] text-faint">صورة توضيحية للواجهة</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-extrabold">ثلاث خطوات من الإعلان إلى العميل</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="surface p-5">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[image:var(--grad)] font-extrabold text-white num">{i + 1}</span>
              <h3 className="mt-3 text-lg font-bold">{s.t}</h3>
              <p className="mt-1 text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="surface p-5">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${f.tone}`}>
                <f.icon size={22} aria-hidden />
              </span>
              <h3 className="mt-3 text-lg font-bold">{f.t}</h3>
              <p className="mt-1 text-muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="hero-card grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="relative z-10">
            <h2 className="text-2xl font-extrabold">بياناتك معزولة ومحمية</h2>
            <p className="mt-2 max-w-2xl opacity-90">
              كل شركة في مساحة مستقلة تفرضها قاعدة البيانات نفسها، وروابط النماذج العامة للإرسال فقط. لا نبيع بياناتك ولا نشاركها.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={18} /> عزل على مستوى قاعدة البيانات</span>
              <span className="inline-flex items-center gap-1.5"><Smartphone size={18} /> تطبيق قابل للتثبيت</span>
            </div>
          </div>
          <Link href="/register" className="btn relative z-10 bg-white text-[#1a3fae]">أنشئ مساحتك الآن</Link>
        </div>
      </section>
    </>
  );
}
