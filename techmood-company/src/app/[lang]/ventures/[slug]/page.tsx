import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero, SectionHead, VentureCard, VentureMark } from "@/components/Blocks";
import { Icon } from "@/components/Icon";
import { JsonLd } from "@/components/JsonLd";
import { StatusBadge } from "@/components/StatusBadge";
import { FollowButton } from "@/components/client/FollowButton";
import { COMPANY } from "@/config/company";
import { SITE_URL } from "@/config/site";
import { VENTURES, getVenture } from "@/data/ventures";
import { LOCALES, href, isLocale, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";
import { statusDescription } from "@/lib/status";

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => VENTURES.map((venture) => ({ lang, slug: venture.slug })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[lang]/ventures/[slug]">) {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const venture = getVenture(slug);
  if (!venture) return {};
  return pageMetadata({ locale, path: `/ventures/${slug}`, title: venture.name[locale], description: venture.tagline[locale] });
}

export default async function VenturePage({ params }: PageProps<"/[lang]/ventures/[slug]">) {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const venture = getVenture(slug);
  if (!venture) notFound();
  const t = translator(locale);
  const others = VENTURES.filter((other) => other.slug !== slug).slice(0, 3);
  const contact = href(locale, `/contact?type=venture&topic=${venture.slug}`);
  const released = venture.status === "live" || venture.status === "beta";

  return (
    <>
      <PageHero
        locale={locale}
        title={venture.name[locale]}
        lead={venture.tagline[locale]}
        crumbs={[
          { path: "/ventures", label: t("المشاريع", "Ventures") },
          { path: `/ventures/${slug}`, label: venture.name[locale] },
        ]}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <VentureMark venture={venture} locale={locale} size={44} />
          <StatusBadge status={venture.status} locale={locale} />
          <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>{venture.field[locale]}</span>
        </div>
        <div className="hero-actions">
          {venture.url && released && (
            <a href={venture.url} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              {t("افتح المنتج", "Open the product")}
              <Icon name="external" size={17} />
            </a>
          )}
          <Link href={contact} className={venture.url && released ? "btn btn-ghost" : "btn btn-primary"}>
            {t("تواصل بشأن المشروع", "Contact us about it")}
          </Link>
          <FollowButton slug={venture.slug} status={venture.status} name={venture.name[locale]} />
        </div>
      </PageHero>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container detail">
          <div>
            <div className="card prose-card">
              <h2>{t("المشكلة", "The problem")}</h2>
              <p>{venture.problem[locale]}</p>
            </div>
            <div className="card prose-card">
              <h2>{t("الحل", "The solution")}</h2>
              <p>{venture.solution[locale]}</p>
            </div>
            <div className="card prose-card">
              <h2>{released ? t("ما يتضمنه حاليًا", "What it includes today") : t("نطاق التطوير", "Development scope")}</h2>
              <ul className="check-list">
                {venture.scope[locale].map((item) => (
                  <li key={item}>
                    <Icon name="check" size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <aside className="card">
            <dl className="fact-list">
              <div>
                <dt>{t("الحالة الحالية", "Current status")}</dt>
                <dd>
                  <StatusBadge status={venture.status} locale={locale} />
                </dd>
                <dd style={{ fontWeight: 400, color: "var(--muted)", fontSize: "0.9rem", marginTop: 4 }}>{statusDescription(venture.status, locale)}</dd>
              </div>
              <div>
                <dt>{t("المجال", "Field")}</dt>
                <dd>{venture.field[locale]}</dd>
              </div>
              <div>
                <dt>{t("الفئة المستهدفة", "Audience")}</dt>
                <dd>
                  <ul className="tag-list" style={{ marginTop: 4 }}>
                    {venture.audience[locale].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>{t("رابط المنتج", "Product link")}</dt>
                <dd>
                  {venture.url && released ? (
                    <a href={venture.url} target="_blank" rel="noopener noreferrer" className="ltr" style={{ color: "var(--royal)" }}>
                      {venture.url.replace("https://", "")}
                    </a>
                  ) : (
                    <span style={{ fontWeight: 400, color: "var(--muted)" }}>{t("لا يوجد رابط عام بعد — المشروع لم يُطلق.", "No public link yet — not released.")}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>{t("الجهة المطوّرة", "Built by")}</dt>
                <dd className="ltr" style={{ textAlign: "start" }}>{COMPANY.name}</dd>
              </div>
            </dl>
            <Link href={contact} className="btn btn-soft">
              <Icon name="chat" size={17} />
              {t("اسأل عن المشروع", "Ask about it")}
            </Link>
          </aside>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHead title={t("مشاريع أخرى", "Other ventures")} />
          <div className="grid grid-3">
            {others.map((other) => (
              <VentureCard key={other.slug} venture={other} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      {venture.url && released && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: venture.name[locale],
            description: venture.tagline[locale],
            url: venture.url,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            publisher: { "@type": "Organization", name: COMPANY.name, url: SITE_URL },
          }}
        />
      )}
    </>
  );
}
