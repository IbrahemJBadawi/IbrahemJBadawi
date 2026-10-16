/** مصادر المحتوى المعتمدة في المنصة (تظهر في صفحة «مصادر المحتوى» وتُدار من لوحة الإدارة). */
export interface ContentSource {
  title: string;
  author?: string;
  publisher?: string;
  url?: string;
  license?: string;
  kind: "quran" | "tafsir" | "hadith" | "adhkar" | "learning" | "other";
  notes?: string;
}

export const SOURCES: ContentSource[] = [
  {
    title: "مصحف المدينة النبوية — رواية حفص عن عاصم (النص العثماني، الإصدار 13)",
    publisher: "مجمع الملك فهد لطباعة المصحف الشريف",
    url: "https://qurancomplex.gov.sa/",
    license: "يُستخدم النص حرفيًا دون تعديل وفق شروط المجمع",
    kind: "quran",
    notes:
      "نُقل عبر مستودع fawazahmed0/quran-api، وتم التحقق آليًا من تطابق الحروف في جميع الآيات (6236) مع نسخة موسوعة القرآن الكريم QuranEnc.",
  },
  {
    title: "موسوعة القرآن الكريم QuranEnc — النص العثماني (مصدر تحقق)",
    url: "https://quranenc.com/",
    license: "عبر حزمة quran-json (CC BY 4.0)",
    kind: "quran",
    notes: "يُستخدم للتحقق المستقل من سلامة النص فقط.",
  },
  {
    title: "بيانات المصحف الوصفية (الصفحات والأجزاء والأحزاب والسجدات)",
    publisher: "quran-meta",
    url: "https://github.com/quran-center/quran-meta",
    license: "MIT",
    kind: "quran",
    notes: "تقسيم صفحات مصحف المدينة (604 صفحة) لرواية حفص.",
  },
  {
    title: "التفسير الميسر",
    author: "نخبة من العلماء",
    publisher: "مجمع الملك فهد لطباعة المصحف الشريف",
    url: "https://qurancomplex.gov.sa/",
    kind: "tafsir",
    notes: "تُقتبس منه معاني الآيات في «لحظة واحة» مع الإشارة إليه.",
  },
  {
    title: "حصن المسلم من أذكار الكتاب والسنة",
    author: "سعيد بن علي بن وهف القحطاني",
    kind: "adhkar",
    notes: "مرجع ترتيب الأذكار وتخريجها؛ وكل ذكر في المنصة يُذكر معه مصدره من كتب الحديث.",
  },
  {
    title: "تقويم أم القرى",
    kind: "other",
    notes: "التاريخ الهجري يُحسب بمحرك التقويم المدمج في المتصفح (islamic-umalqura)، وقد يختلف بيوم عن الرؤية المحلية.",
  },
];
