import { CtaBand, PageHero, SectionHead, ServiceCard } from "@/components/Blocks";
import { COLLABORATION_STEPS, SERVICES } from "@/data/services";
import { isLocale, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/services">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: "/services",
    title: t("الخدمات", "Services"),
    description: t(
      "خدمات TechMood Technology: الذكاء الاصطناعي والأتمتة، تطوير البرمجيات، التحول الرقمي، تحليل البيانات، إدارة المنتجات والفرق، التعليم التقني، وبناء المشاريع الناشئة.",
      "TechMood Technology services: AI & automation, software development, digital transformation, data analytics, product & agile management, technology education and startup building.",
    ),
  });
}

export default async function ServicesPage({ params }: PageProps<"/[lang]/services">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t("ماذا نقدم", "What we offer")}
        title={t("خدمات تقنية تبدأ من احتياجك", "Technology services that start from your needs")}
        lead={t(
          "اختر الخدمة الأقرب لما تحتاجه لتعرف المشكلة التي تعالجها والمخرجات الممكنة وطريقة التعاون. الأسعار والجداول تُحدد في مقترح مكتوب بعد فهم المشروع.",
          "Pick the service closest to your need to see the problem it solves, what it can deliver and how we work together. Pricing and timelines are set in a written proposal once we understand the project.",
        )}
        crumbs={[{ path: "/services", label: t("الخدمات", "Services") }]}
      />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <div className="grid grid-3">
            {SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service} locale={locale} />
            ))}
          </div>
        </div>
      </section>
      <section className="section section-soft">
        <div className="container">
          <SectionHead title={t("كيف نتعاون", "How we work together")} lead={t("الخطوات نفسها لكل خدمة.", "The same steps for every service.")} />
          <ol className="steps is-4">
            {COLLABORATION_STEPS.map((step) => (
              <li key={step.title.en}>
                <h3>{step.title[locale]}</h3>
                <p>{step.body[locale]}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <CtaBand locale={locale} />
    </>
  );
}
