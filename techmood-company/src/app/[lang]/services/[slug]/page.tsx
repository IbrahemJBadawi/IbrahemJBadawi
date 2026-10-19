import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, SectionHead, ServiceCard } from "@/components/Blocks";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { COMPANY } from "@/config/company";
import { SITE_URL } from "@/config/site";
import { COLLABORATION_STEPS, SERVICES, getService } from "@/data/services";
import { LOCALES, href, isLocale, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => SERVICES.map((service) => ({ lang, slug: service.slug })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[lang]/services/[slug]">) {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const service = getService(slug);
  if (!service) return {};
  return pageMetadata({ locale, path: `/services/${slug}`, title: service.title[locale], description: service.summary[locale] });
}

export default async function ServicePage({ params }: PageProps<"/[lang]/services/[slug]">) {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const service = getService(slug);
  if (!service) notFound();
  const t = translator(locale);
  const others = SERVICES.filter((other) => other.slug !== slug).slice(0, 3);
  const request = href(locale, `/contact?type=service&topic=${service.slug}`);

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t("خدمة", "Service")}
        title={service.title[locale]}
        lead={service.summary[locale]}
        crumbs={[
          { path: "/services", label: t("الخدمات", "Services") },
          { path: `/services/${slug}`, label: service.title[locale] },
        ]}
      >
        <div className="hero-actions">
          <Link href={request} className="btn btn-primary">
            {t("اطلب هذه الخدمة", "Request this service")}
            <Icon name="arrow" size={18} className="flip-rtl" />
          </Link>
        </div>
      </PageHero>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container detail">
          <div>
            <div className="card prose-card">
              <h2>{t("المشكلة التي نعالجها", "The problem we solve")}</h2>
              <p>{service.problem[locale]}</p>
            </div>
            <div className="card prose-card">
              <h2>{t("المخرجات الممكنة", "What we can deliver")}</h2>
              <ul className="check-list">
                {service.deliverables[locale].map((item) => (
                  <li key={item}>
                    <Icon name="check" size={18} />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="note" style={{ marginTop: 8 }}>
                <Icon name="lightbulb" size={18} />
                {t("تُحدد المخرجات النهائية حسب كل مشروع، وتُكتب في المقترح قبل البدء.", "Final deliverables depend on each project and are written into the proposal before work starts.")}
              </p>
            </div>
          </div>
          <aside className="card">
            <h2 style={{ fontSize: "1.05rem" }}>{t("لمن هذه الخدمة؟", "Who is it for?")}</h2>
            <ul className="tag-list">
              {service.audience[locale].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href={request} className="btn btn-primary" style={{ marginTop: 8 }}>
              {t("اطلب الخدمة", "Request the service")}
            </Link>
            <Link href={href(locale, "/solutions")} className="btn btn-ghost">
              {t("الحلول حسب الفئة", "Solutions by audience")}
            </Link>
          </aside>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHead title={t("خطوات التعاون", "How we'll work together")} />
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

      <section className="section">
        <div className="container">
          <SectionHead title={t("خدمات أخرى", "Other services")} />
          <div className="grid grid-3">
            {others.map((other) => (
              <ServiceCard key={other.slug} service={other} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title[locale],
          description: service.summary[locale],
          provider: { "@type": "Organization", name: COMPANY.name, url: SITE_URL },
          areaServed: "Worldwide",
          inLanguage: locale,
        }}
      />
    </>
  );
}
