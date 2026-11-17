import {
  CircleDot,
  Clock,
  BookMarked,
  BookOpen,
  CalendarCheck,
  CloudOff,
  GraduationCap,
  Leaf,
  Lock,
  Moon,
  HeartHandshake,
  Smartphone,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AyahMarker } from "@/components/quran/AyahMarker";
import { OasisScene } from "@/components/OasisScene";
import { ButtonLink } from "@/components/ui/Button";
import { readSurahText } from "@/lib/quran/server";
import { getSurahMeta, toArabicDigits } from "@/lib/quran";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — اجعل للقرآن مكانًا في كل يوم` },
  alternates: { canonical: "/" },
};

const SECTIONS: { href: string; title: string; text: string; icon: LucideIcon }[] = [
  { href: "/quran", title: "القرآن الكريم", text: "مصحف بالرسم العثماني من مجمع الملك فهد، بقراءة هادئة وحفظ تلقائي لموضعك.", icon: BookOpen },
  { href: "/adhkar", title: "الأذكار والأدعية", text: "أذكار الصباح والمساء والنوم وبعد الصلاة، مع عدّاد وتخريج لكل ذكر.", icon: Sparkles },
  { href: "/oasis", title: "لحظة واحة", text: "آية كل يوم، ومعناها من تفسير معتمد، وسؤال للتفكّر ومساحة لخواطرك.", icon: Leaf },
  { href: "/plan", title: "الورد والختمة", text: "هدف يومي مرن وخطة ختمة تُحسب من صفحات المصحف الفعلية.", icon: CalendarCheck },
  { href: "/prayer", title: "مواقيت الصلاة والقبلة", text: "مواقيت محسوبة على جهازك لمدينتك، مع عدّ تنازلي وبوصلة للقبلة — دون إنترنت.", icon: Clock },
  { href: "/tasbih", title: "المسبحة", text: "عدّاد تسبيح هادئ بدورات ٣٣ و١٠٠، يحفظ عدّك تلقائيًا.", icon: CircleDot },
  { href: "/hifz", title: "الحفظ والمراجعة", text: "سجّل محفوظك، ودوّن ملاحظاتك، واعرف ما يحين وقت مراجعته.", icon: BookMarked },
  { href: "/learn", title: "التعلّم", text: "مسارات قصيرة في التجويد والقراءة الصحيحة والحفظ والتدبّر.", icon: GraduationCap },
  { href: "/khalwa", title: "الخلوة", text: "وقت شخصي هادئ للذكر، والتوبة، والقرآن، والتدبّر، والدعاء، مع مؤقّت اختياري.", icon: Moon },
  { href: "/khalili", title: "خليلي", text: "تحدٍّ ودّي مع خليل في ورد القرآن والحفظ والمراجعة، مع متابعة الإنجاز دون مقارنة لقيمة العبادة.", icon: HeartHandshake },
];

const FEATURES: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "بلا حساب للبدء", text: "تصفّح وتقدّم مباشرة؛ ويُحفظ تقدمك على جهازك حتى تقرر إنشاء حساب.", icon: UserRound },
  { title: "يعمل دون اتصال", text: "ثبّت المنصة على هاتفك ونزّل المصحف لقراءته دون إنترنت.", icon: CloudOff },
  { title: "خصوصيتك أولًا", text: "نجمع الحد الأدنى من البيانات، وخواطرك لا يطّلع عليها أحد غيرك.", icon: Lock },
  { title: "لهاتفك أولًا", text: "تصميم مريح للشاشات الصغيرة، ويتسع بأناقة على الحاسوب.", icon: Smartphone },
  { title: "وضع ليلي", text: "قراءة مريحة للعين في الليل، مع تحكم بحجم الخط.", icon: Moon },
];

const FAQ = [
  {
    q: "هل المنصة مجانية؟",
    a: "نعم، المنصة مجانية، ولا توجد إعلانات داخل المصحف أو الأذكار.",
  },
  {
    q: "ما مصدر نص القرآن الكريم؟",
    a: "نص مصحف المدينة النبوية برواية حفص عن عاصم الصادر عن مجمع الملك فهد لطباعة المصحف الشريف، ويُعرض دون أي تعديل. وقد تحققنا آليًا من تطابق حروف جميع الآيات مع مصدر مستقل ثانٍ.",
  },
  {
    q: "هل أحتاج إلى إنشاء حساب؟",
    a: "لا. يمكنك القراءة والأذكار وبناء وردك فورًا، ويُحفظ تقدمك على جهازك. الحساب يفيدك في مزامنة تقدمك بين أجهزتك وعدم فقدانه.",
  },
  {
    q: "هل تتحقق المنصة من صحة تلاوتي أو حفظي؟",
    a: "لا. قسم الحفظ أداة لتنظيم الحفظ والمراجعة فقط، والتحقق من صحة التلاوة يكون بالتلقي من معلّم متقن.",
  },
  {
    q: "هل تُرسل لي إشعارات؟",
    a: "لا تُرسل أي تذكيرات إلا إذا فعّلتها بنفسك من الإعدادات، ويمكنك إيقافها في أي وقت.",
  },
];

export default async function HomePage() {
  // آية «لحظة واحة» التعريفية — تُقرأ من النص المعتمد وقت البناء
  const surah = await readSurahText(13);
  const ayah = surah?.ayahs[27];
  const meta = getSurahMeta(13)!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    alternateName: SITE.nameEn,
    url: SITE.url,
    inLanguage: "ar",
    description: SITE.description,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ───────── البطل ───────── */}
      <section className="mihrab-landing relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-7 px-4 pb-14 pt-10 md:grid-cols-[1fr_.96fr] md:gap-12 md:pb-24 md:pt-20">
          <div className="relative z-10">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft px-3 py-1 text-xs font-bold text-gold-fg sm:text-sm">
              <Leaf className="h-4 w-4" aria-hidden="true" />
              {SITE.tagline}
            </p>
            <h1 className="font-naskh text-[2.9rem] font-bold leading-[1.35] text-fg sm:text-6xl md:text-[4.5rem] md:leading-[1.35]">
              اجعل للقرآن مكانًا
              <br />
              <span className="text-primary">في كل يوم</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-muted sm:text-lg sm:leading-9">
              رفيق يومي يجمع لك المصحف والأذكار والورد والتدبّر والحفظ والخلوة، مع خيار التحدّي الودّي مع خليل لتتشجعا على الاستمرار، دون ضغط.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/today" size="lg">
                ابدأ رحلتك
              </ButtonLink>
              <ButtonLink href="/quran" size="lg" variant="outline">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                تصفّح القرآن
              </ButtonLink>
            </div>
            <p className="mt-4 text-xs text-muted sm:text-sm">مجانية، بلا إعلانات، ولا تحتاج إلى حساب للبدء.</p>
          </div>
          <div className="mihrab-frame relative mx-auto w-full max-w-[31rem]">
            <OasisScene className="w-full drop-shadow-[0_20px_34px_rgba(25,63,50,.16)]" />
            {ayah && (
              <figure className="mihrab-verse relative -mt-14 mx-2 rounded-[1.3rem] p-5 backdrop-blur sm:mx-8 sm:p-6">
                <figcaption className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
                  <span className="inline-flex items-center gap-1.5 text-accent">
                    <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                    لحظة واحة
                  </span>
                  <span>
                    سورة {meta.name} · الآية {toArabicDigits(ayah.a)}
                  </span>
                </figcaption>
                <blockquote className="quran-inline text-center text-fg" lang="ar">
                  {ayah.t}
                  <AyahMarker n={ayah.a} />
                </blockquote>
              </figure>
            )}
          </div>
        </div>
      </section>

      {/* ───────── الأقسام ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="sections-title">
        <h2 id="sections-title" className="font-naskh text-3xl font-bold md:text-4xl">
          كل ما تحتاجه لصحبة القرآن
        </h2>
        <p className="mt-2 text-muted">أقسام مترابطة، كل منها يخدم وردك اليومي.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {SECTIONS.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              className={`sacred-tile group rounded-[1.4rem] p-5 focus-ring sm:p-6 ${i < 2 ? "sacred-tile-featured lg:col-span-2" : ""}`}
            >
              <span className={`grid h-12 w-12 place-items-center rounded-[1rem] ${i < 2 ? "bg-primary text-primary-fg" : "bg-accent-soft text-primary"}`}>
                <s.icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className={`mt-4 font-bold group-hover:text-primary ${i < 2 ? "font-naskh text-[1.65rem]" : "text-lg"}`}>{s.title}</h3>
              <p className="mt-1 max-w-xl text-sm leading-7 text-muted sm:text-[15px]">{s.text}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── كيف تبني وردك ───────── */}
      <section className="pattern-bg bg-deep text-ivory" aria-labelledby="wird-title">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="wird-title" className="font-naskh text-3xl font-bold md:text-4xl">
            كيف تساعدك الواحة على بناء وردك اليومي؟
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                t: "اختر هدفًا يناسبك",
                d: "صفحة أو صفحتان أو جزء — أو خطة ختمة بمدة تحددها أنت. يمكنك تعديلها أو إيقافها متى شئت.",
              },
              {
                t: "اقرأ، وتُحسب قراءتك تلقائيًا",
                d: "يحفظ القارئ موضعك، ويحسب الآيات التي قرأتها فعلًا بناءً على صفحات مصحف المدينة.",
              },
              {
                t: "تابع يومك بهدوء",
                d: "مهام يومك في لوحة واحدة: الورد، والأذكار، والخلوة. ويمكنك اختيار تحدٍّ وديّ للأنشطة القابلة للقياس، دون مشاركة خواطرك الخاصة.",
              },
            ].map((step, i) => (
              <li key={step.t} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold text-lg font-bold text-deep">{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold">{step.t}</h3>
                <p className="mt-2 leading-relaxed text-ivory/75">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── المزايا ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="features-title">
          <h2 id="features-title" className="font-naskh text-3xl font-bold md:text-4xl">
          صُممت لتكون بسيطة وهادئة
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-[var(--radius-card)] bg-surface-2 p-5">
              <f.icon className="h-6 w-6 text-accent" aria-hidden="true" />
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── لحظة واحة ───────── */}
      <section className="pattern-bg border-y border-line" aria-labelledby="oasis-title">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h2 id="oasis-title" className="font-naskh text-3xl font-bold md:text-4xl">
              لحظة واحة: دقيقتان من السكينة كل يوم
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              كل يوم آية مختارة، ومعها معناها من تفسير معتمد، ثم سؤال للتفكّر أو خطوة عملية صغيرة. ولك مساحة خاصة تكتب فيها خاطرتك.
            </p>
            <ButtonLink href="/oasis" className="mt-6" variant="gold">
              افتح لحظة اليوم
            </ButtonLink>
          </div>
          <ul className="space-y-3">
            {[
              { k: "النص القرآني", v: "من مصحف المدينة النبوية، كما هو دون تعديل.", tone: "bg-accent-soft" },
              { k: "المعنى", v: "منقول من تفسير معتمد مع ذكر مصدره.", tone: "bg-gold-soft" },
              { k: "التأمل", v: "سؤال تحريري للتفكّر، يُوسم بوضوح أنه ليس تفسيرًا.", tone: "bg-surface-2" },
            ].map((x) => (
              <li key={x.k} className={`rounded-2xl ${x.tone} p-4`}>
                <p className="text-sm font-bold">{x.k}</p>
                <p className="text-sm text-muted">{x.v}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────── أسئلة شائعة ───────── */}
      <section className="mx-auto max-w-3xl px-4 py-16" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-center text-2xl font-bold md:text-3xl">
          أسئلة شائعة
        </h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-line bg-surface p-5 open:border-accent">
              <summary className="cursor-pointer list-none font-bold marker:hidden focus-ring rounded">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-accent transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12 text-center">
          <ButtonLink href="/today" size="lg">
            ابدأ رحلتك الآن
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
