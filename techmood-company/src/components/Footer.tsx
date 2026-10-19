import Link from "next/link";
import { COMPANY, CONTACT, SOCIAL_LINKS } from "@/config/company";
import { NAV } from "@/config/nav";
import { SERVICES } from "@/data/services";
import { VENTURES } from "@/data/ventures";
import { href, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

export function Footer({ locale }: { locale: Locale }) {
  const t = translator(locale);
  const year = new Date().getUTCFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-about">
            <Link href={href(locale, "/")} className="brand">
              <Logo size={34} />
            </Link>
            <p>
              {t(
                "الشركة الأم التي تطوّر وتدير منتجات ومشاريع وخدمات تقنية — منظومة تقنية مدعومة بالذكاء الاصطناعي لمستقبل العمل.",
                "The parent company that builds and runs technology products, ventures and services — an AI-powered technology ecosystem for the future of work.",
              )}
            </p>
            <div className="socials">
              {SOCIAL_LINKS.map((link) => (
                <a key={link.key} className="icon-btn" href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} — @techmoodtech`}>
                  <Icon name={link.key} size={18} />
                </a>
              ))}
            </div>
          </div>
          <nav aria-label={t("صفحات الموقع", "Site pages")}>
            <h2>{t("الموقع", "Site")}</h2>
            <ul>
              {NAV.map((item) => (
                <li key={item.path}>
                  <Link href={href(locale, item.path)}>{item.label[locale]}</Link>
                </li>
              ))}
              <li>
                <Link href={href(locale, "/app")}>{t("التطبيق والإعدادات", "App & settings")}</Link>
              </li>
            </ul>
          </nav>
          <nav aria-label={t("المشاريع", "Ventures")}>
            <h2>{t("المشاريع", "Ventures")}</h2>
            <ul>
              {VENTURES.map((venture) => (
                <li key={venture.slug}>
                  <Link href={href(locale, `/ventures/${venture.slug}`)}>{venture.name[locale]}</Link>
                </li>
              ))}
            </ul>
            <h2 style={{ marginTop: 20 }}>{t("الخدمات", "Services")}</h2>
            <ul>
              {SERVICES.slice(0, 4).map((service) => (
                <li key={service.slug}>
                  <Link href={href(locale, `/services/${service.slug}`)}>{service.title[locale]}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2>{t("تواصل", "Contact")}</h2>
            <ul>
              <li>
                <a href={`mailto:${CONTACT.email}`} className="ltr">{CONTACT.email}</a>
              </li>
              <li>
                <a href={CONTACT.telegramChannel.href} target="_blank" rel="noopener noreferrer">
                  {t("قناة Telegram", "Telegram channel")} <span className="ltr">{CONTACT.telegramChannel.handle}</span>
                </a>
              </li>
              <li>
                <a href={CONTACT.telegramCommunity.href} target="_blank" rel="noopener noreferrer">
                  {t("مجتمع Telegram", "Telegram community")} <span className="ltr">{CONTACT.telegramCommunity.handle}</span>
                </a>
              </li>
              <li>{t("فلسطين", "Palestine")}</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {year} {COMPANY.name}. {t("جميع الحقوق محفوظة.", "All rights reserved.")} <span className="ltr">{COMPANY.tagline}</span>
          </span>
          <nav aria-label={t("روابط قانونية", "Legal")}>
            <Link href={href(locale, "/privacy")}>{t("الخصوصية", "Privacy")}</Link>
            <Link href={href(locale, "/terms")}>{t("الشروط", "Terms")}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
