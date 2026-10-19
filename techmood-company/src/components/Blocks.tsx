import Link from "next/link";
import type { ReactNode } from "react";
import type { Service } from "@/data/services";
import type { Venture } from "@/data/ventures";
import { href, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { Icon } from "./Icon";
import { StatusBadge } from "./StatusBadge";
import { FollowButton } from "./client/FollowButton";

export function PageHero({
  locale,
  eyebrow,
  title,
  lead,
  crumbs = [],
  children,
}: {
  locale: Locale;
  eyebrow?: string;
  title: string;
  lead?: string;
  crumbs?: { path: string; label: string }[];
  children?: ReactNode;
}) {
  const t = translator(locale);
  return (
    <section className="page-hero">
      <div className="container">
        <div className="inner reveal">
          {crumbs.length > 0 && (
            <nav className="breadcrumbs" aria-label={t("مسار التنقل", "Breadcrumb")}>
              <ol>
                <li>
                  <Link href={href(locale, "/")}>{t("الرئيسية", "Home")}</Link>
                </li>
                {crumbs.map((crumb, index) => (
                  <li key={crumb.path} aria-current={index === crumbs.length - 1 ? "page" : undefined}>
                    {index === crumbs.length - 1 ? crumb.label : <Link href={href(locale, crumb.path)}>{crumb.label}</Link>}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}

export function SectionHead({ title, lead, action }: { title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {lead && <p>{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function CtaBand({ locale, title, body }: { locale: Locale; title?: string; body?: string }) {
  const t = translator(locale);
  return (
    <section className="section">
      <div className="container">
        <div className="cta-band">
          <div>
            <h2>{title ?? t("لديك فكرة أو تحدٍّ تقني؟", "Have an idea or a technical challenge?")}</h2>
            <p style={{ marginTop: 10 }}>
              {body ??
                t(
                  "أخبرنا عن مشروعك، وسنعود إليك لنفهم احتياجك ونقترح الخطوة التالية المناسبة.",
                  "Tell us about your project and we'll get back to you to understand what you need and suggest the right next step.",
                )}
            </p>
          </div>
          <div className="hero-actions" style={{ marginTop: 0 }}>
            <Link href={href(locale, "/contact")} className="btn btn-primary">
              {t("ابدأ مشروعًا", "Start a project")}
              <Icon name="arrow" size={18} className="flip-rtl" />
            </Link>
            <Link href={href(locale, "/services")} className="btn btn-ghost">
              {t("استكشف الخدمات", "Explore services")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ServiceCard({ service, locale }: { service: Service; locale: Locale }) {
  const t = translator(locale);
  return (
    <Link href={href(locale, `/services/${service.slug}`)} className="card">
      <span className="icon-tile">
        <Icon name={service.icon} size={24} />
      </span>
      <h3>{service.title[locale]}</h3>
      <p>{service.summary[locale]}</p>
      <span className="card-foot">
        <span className="see-all" style={{ fontSize: "0.9rem" }}>{t("التفاصيل", "Details")}</span>
        <span className="go" aria-hidden="true">
          <Icon name="arrow" size={17} className="flip-rtl" />
        </span>
      </span>
    </Link>
  );
}

const MARK_COLORS: Record<string, string> = {
  "techmood-platform": "linear-gradient(140deg,#1d4ed8,#38bdf8)",
  halaqati: "linear-gradient(140deg,#0f766e,#34d399)",
  "al-jamal": "linear-gradient(140deg,#8a5a3c,#d6a77a)",
  "techmood-growth": "linear-gradient(140deg,#0b1b3f,#4f7cff)",
  "wahat-al-quran": "linear-gradient(140deg,#166534,#a3e635)",
};

const MARK_INITIALS: Record<string, { ar: string; en: string }> = {
  "techmood-platform": { ar: "T", en: "T" },
  halaqati: { ar: "ح", en: "H" },
  "al-jamal": { ar: "ج", en: "J" },
  "techmood-growth": { ar: "G", en: "G" },
  "wahat-al-quran": { ar: "و", en: "W" },
};

export function VentureMark({ venture, locale, size = 52 }: { venture: Venture; locale: Locale; size?: number }) {
  return (
    <span className="venture-mark" style={{ background: MARK_COLORS[venture.slug] ?? MARK_COLORS["techmood-platform"], width: size, height: size }} aria-hidden="true">
      {(MARK_INITIALS[venture.slug] ?? { ar: "T", en: "T" })[locale]}
    </span>
  );
}

export function VentureCard({ venture, locale }: { venture: Venture; locale: Locale }) {
  const t = translator(locale);
  return (
    <article className="card venture-card is-link">
      <div className="head">
        <VentureMark venture={venture} locale={locale} />
        <StatusBadge status={venture.status} locale={locale} />
      </div>
      <div>
        <h3>
          <Link href={href(locale, `/ventures/${venture.slug}`)} className="stretched">
            {venture.name[locale]}
          </Link>
        </h3>
        <span className="field">{venture.field[locale]}</span>
      </div>
      <p>{venture.tagline[locale]}</p>
      <ul className="tag-list" aria-label={t("الفئة المستهدفة", "Audience")}>
        {venture.audience[locale].slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="card-foot venture-actions">
        <Link href={href(locale, `/ventures/${venture.slug}`)} className="btn btn-soft btn-sm">
          {t("استكشف المشروع", "Explore")}
        </Link>
        <FollowButton slug={venture.slug} status={venture.status} name={venture.name[locale]} compact />
      </div>
    </article>
  );
}
