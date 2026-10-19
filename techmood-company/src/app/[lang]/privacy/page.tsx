import Link from "next/link";
import { PageHero } from "@/components/Blocks";
import { COMPANY, CONTACT } from "@/config/company";
import { href, isLocale, type Locale } from "@/i18n/config";
import { formatDate, translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";

const UPDATED = "2026-10-19";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: "/privacy",
    title: t("سياسة الخصوصية", "Privacy policy"),
    description: t("كيف يتعامل موقع TechMood Technology مع بياناتك: ما نجمعه عبر نموذج التواصل، وما يُحفظ على جهازك فقط.", "How the TechMood Technology website handles your data: what the contact form collects, and what stays on your device only."),
  });
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/privacy">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return (
    <>
      <PageHero locale={locale} title={t("سياسة الخصوصية", "Privacy policy")} lead={t(`آخر تحديث: ${formatDate(locale, UPDATED)}`, `Last updated: ${formatDate(locale, UPDATED)}`)} crumbs={[{ path: "/privacy", label: t("الخصوصية", "Privacy") }]} />
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="container legal">
          <p>
            {t(
              `توضّح هذه السياسة كيف يتعامل موقع ${COMPANY.name} مع المعلومات. هي نسخة أولية قابلة للتحديث، ولا تمثل شهادة امتثال لأي تشريع بعينه.`,
              `This policy explains how the ${COMPANY.name} website handles information. It is a first version that may be updated, and it does not claim certified compliance with any specific law.`,
            )}
          </p>
          <h2>{t("ما نجمعه عبر نموذج التواصل", "What the contact form collects")}</h2>
          <ul>
            <li>{t("الاسم والبريد الإلكتروني، والجهة إن أدخلتها.", "Your name, email and, if you enter it, your organisation.")}</li>
            <li>{t("نوع الطلب، والميزانية التقديرية إن اخترتها، ووصف المشروع.", "The request type, the estimated budget if you choose one, and your project description.")}</li>
          </ul>
          <p>{t("نستخدم هذه المعلومات فقط للرد على طلبك ومتابعته، ولا نبيعها ولا نشاركها لأغراض تسويقية.", "We use this information only to answer and follow up on your request. We don't sell it or share it for marketing.")}</p>
          <h2>{t("كيف تُنقل الرسالة", "How your message is delivered")}</h2>
          <p>
            {t(
              "عند تفعيل الإرسال المباشر، تُنقل رسالتك إلى بريد الشركة عبر مزوّد إرسال بريد، و/أو إلى حساب Telegram خاص بالشركة. يمر الطلب عبر خوادم الاستضافة التي يعمل عليها الموقع.",
              "When direct sending is enabled, your message is passed to the company's inbox through an email delivery provider and/or to a private company Telegram account. The request passes through the servers that host the website.",
            )}
          </p>
          <h2>{t("ما يُحفظ على جهازك فقط", "What stays on your device only")}</h2>
          <p>
            {t(
              "يحفظ الموقع في التخزين المحلي لمتصفحك: المظهر المختار، والمشاريع التي تتابعها، والمستجدات التي قرأتها، وحالة الإشعارات، ومسودة نموذج التواصل غير المرسلة. كما يحفظ ملف تعريف ارتباط واحدًا لتذكّر اللغة. لا تُرسل هذه البيانات إلى أي خادم، ويمكنك مسحها في أي وقت من ",
              "The site keeps in your browser's local storage: your chosen appearance, the ventures you follow, the updates you've read, your notification setting and any unsent contact draft. It also sets one cookie to remember your language. None of this is sent to a server, and you can clear it any time from ",
            )}
            <Link href={href(locale, "/app")}>{t("صفحة التطبيق والإعدادات", "the App & settings page")}</Link>.
          </p>
          <h2>{t("الإشعارات", "Notifications")}</h2>
          <p>{t("تظهر إشعارات الجهاز فقط إذا وافقت عليها في المتصفح، ويمكنك إيقافها في أي وقت. لا نحتفظ بأي معرّف لجهازك.", "Device notifications appear only if you allow them in your browser, and you can turn them off any time. We keep no identifier for your device.")}</p>
          <h2>{t("التحليلات والتتبع", "Analytics and tracking")}</h2>
          <p>{t("لا يستخدم الموقع حاليًا أدوات تحليلات أو إعلانات تتتبّع الزوار.", "The site currently uses no analytics or advertising tools that track visitors.")}</p>
          <h2>{t("الروابط الخارجية", "External links")}</h2>
          <p>{t("يحتوي الموقع روابط إلى منتجاتنا وحساباتنا على منصات أخرى، ولكل منها سياسة خصوصية خاصة.", "The site links to our products and to our accounts on other platforms; each has its own privacy policy.")}</p>
          <h2>{t("حقوقك والتواصل", "Your rights and contact")}</h2>
          <p>
            {t("لطلب الاطلاع على بياناتك أو تصحيحها أو حذفها، راسلنا على ", "To ask to see, correct or delete your data, write to ")}
            <a href={`mailto:${CONTACT.email}`} className="ltr">{CONTACT.email}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
