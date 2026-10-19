import { PageHero } from "@/components/Blocks";
import { COMPANY, CONTACT } from "@/config/company";
import { isLocale, type Locale } from "@/i18n/config";
import { formatDate, translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";

const UPDATED = "2026-10-19";

export async function generateMetadata({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: "/terms",
    title: t("شروط الاستخدام", "Terms of use"),
    description: t("شروط استخدام موقع TechMood Technology.", "Terms of use for the TechMood Technology website."),
  });
}

export default async function TermsPage({ params }: PageProps<"/[lang]/terms">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return (
    <>
      <PageHero locale={locale} title={t("شروط الاستخدام", "Terms of use")} lead={t(`آخر تحديث: ${formatDate(locale, UPDATED)}`, `Last updated: ${formatDate(locale, UPDATED)}`)} crumbs={[{ path: "/terms", label: t("الشروط", "Terms") }]} />
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container legal">
          <h2>{t("طبيعة الموقع", "About this website")}</h2>
          <p>
            {t(
              `هذا الموقع تعريفي بشركة ${COMPANY.name} وخدماتها ومشاريعها. المعلومات فيه عامة، ولا تمثل عرضًا ملزمًا أو تعاقدًا. أي عمل مشترك يُتفق عليه في مقترح أو عقد مكتوب منفصل.`,
              `This website presents ${COMPANY.name}, its services and its ventures. Its content is general information, not a binding offer or contract. Any work together is agreed in a separate written proposal or contract.`,
            )}
          </p>
          <h2>{t("المشاريع وحالاتها", "Ventures and their status")}</h2>
          <p>{t("تُعرض المشاريع بحالتها كما هي عند تحديث الموقع، وقد تتغير مزاياها ومواعيدها. لكل منتج منشور شروطه الخاصة على موقعه.", "Ventures are shown with their status at the time the site was updated; their features and timelines may change. Each released product has its own terms on its own site.")}</p>
          <h2>{t("الاستخدام المقبول", "Acceptable use")}</h2>
          <ul>
            <li>{t("لا تُرسل عبر نموذج التواصل محتوى مخالفًا أو مضللًا أو رسائل آلية.", "Don't send unlawful, misleading or automated messages through the contact form.")}</li>
            <li>{t("لا تحاول تعطيل الموقع أو الوصول إلى أجزاء غير مخصصة للعموم.", "Don't try to disrupt the site or access parts not meant for the public.")}</li>
          </ul>
          <h2>{t("الملكية الفكرية", "Intellectual property")}</h2>
          <p>{t(`اسم ${COMPANY.name} وشعارها ومحتوى الموقع ملك للشركة، ولا يجوز استخدامها بما يوحي بتمثيل الشركة دون إذن.`, `The ${COMPANY.name} name, logo and site content belong to the company and may not be used in a way that suggests you represent it without permission.`)}</p>
          <h2>{t("حدود المسؤولية", "Limitation of liability")}</h2>
          <p>{t("نسعى لدقة المعلومات وتوفر الموقع، لكنه يُقدّم كما هو دون ضمانات بعدم الانقطاع أو خلوّه من الأخطاء.", "We aim for accurate information and availability, but the site is provided as is, without guarantees that it is uninterrupted or error-free.")}</p>
          <h2>{t("التعديلات والتواصل", "Changes and contact")}</h2>
          <p>
            {t("قد نحدّث هذه الشروط، ويظهر تاريخ آخر تحديث أعلى الصفحة. للاستفسار: ", "We may update these terms; the date of the latest update is shown above. Questions: ")}
            <a href={`mailto:${CONTACT.email}`} className="ltr">{CONTACT.email}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
