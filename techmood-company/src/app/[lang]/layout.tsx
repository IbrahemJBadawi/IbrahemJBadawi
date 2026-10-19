import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "../globals.css";

import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { BottomNav } from "@/components/client/NavLinks";
import { DeviceWatcher } from "@/components/client/DeviceWatcher";
import { InstallFloat } from "@/components/client/InstallFloat";
import { OfflineBar } from "@/components/client/OfflineBar";
import { COMPANY, CONTACT, SOCIAL_LINKS } from "@/config/company";
import { ALLOW_INDEXING, SITE_URL } from "@/config/site";
import { LocaleProvider } from "@/i18n/client";
import { LOCALES, dirOf, isLocale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { THEME_SCRIPT } from "@/lib/theme";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: COMPANY.name,
    title: {
      default: t("TechMood Technology — نبني قادة المستقبل الرقمي", "TechMood Technology — Building Future Digital Leaders"),
      template: `%s | ${COMPANY.name}`,
    },
    description: t(
      "TechMood Technology: الشركة الأم لمنظومة تقنية مدعومة بالذكاء الاصطناعي لمستقبل العمل — خدمات وبرمجيات ومنتجات رقمية من فلسطين.",
      "TechMood Technology: the parent company of an AI-powered technology ecosystem for the future of work — services, software and digital products from Palestine.",
    ),
    robots: ALLOW_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
    appleWebApp: { capable: true, title: "TechMood", statusBarStyle: "default" },
    formatDetection: { telephone: false },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = translator(lang);

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY.name,
    alternateName: [COMPANY.nameAr, COMPANY.shortName],
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo.png`,
    slogan: COMPANY.tagline,
    foundingDate: COMPANY.foundingDate,
    founder: { "@type": "Person", name: COMPANY.founder },
    address: { "@type": "PostalAddress", addressCountry: COMPANY.country },
    email: CONTACT.email,
    sameAs: SOCIAL_LINKS.map((link) => link.href),
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: COMPANY.name,
    url: SITE_URL,
    inLanguage: ["ar", "en"],
  };

  return (
    <html lang={lang} dir={dirOf(lang)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <LocaleProvider locale={lang}>
          <a href="#main" className="skip-link">
            {t("تخطَّ إلى المحتوى", "Skip to content")}
          </a>
          <Header locale={lang} />
          <OfflineBar />
          <main id="main">{children}</main>
          <Footer locale={lang} />
          <BottomNav />
          <InstallFloat />
          <DeviceWatcher />
        </LocaleProvider>
        <JsonLd data={organization} />
        <JsonLd data={website} />
      </body>
    </html>
  );
}
