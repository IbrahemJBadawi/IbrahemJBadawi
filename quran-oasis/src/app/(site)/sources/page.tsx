import type { Metadata } from "next";
import { Prose } from "@/components/layout/Prose";
import { SOURCES } from "@/content/sources";
import { QURAN } from "@/lib/quran";

export const metadata: Metadata = {
  title: "مصادر المحتوى",
  description: "مصادر النص القرآني والتفسير والأذكار المعتمدة في واحة القرآن، وطريقة التحقق منها.",
  alternates: { canonical: "/sources" },
};

const KIND: Record<string, string> = { quran: "القرآن الكريم", tafsir: "التفسير", hadith: "الحديث", adhkar: "الأذكار", learning: "التعلّم", other: "أخرى" };

export default function SourcesPage() {
  const src = QURAN.source;
  return (
    <Prose title="مصادر المحتوى">
      <p>نلتزم في واحة القرآن بالدقة في كل ما يُنسب إلى القرآن الكريم والسنة النبوية. هذه مصادرنا وطريقة تعاملنا معها.</p>
      <h2>النص القرآني</h2>
      <ul>
        <li>{src.text}.</li>
        <li>لا يُكتب أي نص قرآني يدويًا في المنصة، ولا يُولَّد بالذكاء الاصطناعي؛ كل آية تُعرض من الملف المعتمد.</li>
        <li>
          تحققنا آليًا من تطابق حروف جميع الآيات (٦٢٣٦ آية في ١١٤ سورة) مع مصدر مستقل ثانٍ ({src.verifiedAgainst})، ومن أعداد الآيات وترتيبها.
        </li>
        <li>
          بصمة النص (SHA-256): <code dir="ltr" className="break-all text-xs">{src.textSha256}</code>
        </li>
        <li>تقسيم الصفحات والأجزاء وفق مصحف المدينة النبوية (٦٠٤ صفحات): {src.metadata}.</li>
      </ul>
      <h2>التمييز بين أنواع المحتوى</h2>
      <ul>
        <li>
          <strong>النص القرآني</strong> بخط المصحف، كما ورد في المصدر.
        </li>
        <li>
          <strong>المعنى المنقول</strong> من تفسير معتمد، مع ذكر اسم التفسير.
        </li>
        <li>
          <strong>التأمل التحريري</strong> من فريق المنصة، ويوسم دائمًا بأنه ليس تفسيرًا.
        </li>
        <li>
          <strong>الأذكار</strong> من القرآن وصحيح السنة، مع تخريج كل ذكر (الكتاب ورقم الحديث)، ويُذكر العدد فقط إن ورد في الحديث.
        </li>
      </ul>
      <h2>قائمة المصادر</h2>
      <ul>
        {SOURCES.map((s) => (
          <li key={s.title}>
            <strong>{s.title}</strong> — {KIND[s.kind]}
            {s.author ? ` · ${s.author}` : ""}
            {s.publisher ? ` · ${s.publisher}` : ""}
            {s.license ? ` · ${s.license}` : ""}
            {s.notes && <span className="block text-sm text-muted">{s.notes}</span>}
          </li>
        ))}
      </ul>
      <h2>المراجعة</h2>
      <p>
        يُراجَع المحتوى الشرعي من فريق المحتوى قبل نشره، ويمكن تحديثه من لوحة الإدارة. إن وجدت خطأً فنرجو{" "}
        <a href="/contact">إبلاغنا</a>.
      </p>
    </Prose>
  );
}
