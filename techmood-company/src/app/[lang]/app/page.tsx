import { PageHero } from "@/components/Blocks";
import { InstallCard, LocalDataCard, NotificationsCard, PreferencesCard } from "@/components/client/AppSettings";
import { isLocale, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/app">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: "/app",
    title: t("التطبيق والإعدادات", "App & settings"),
    description: t(
      "ثبّت موقع TechMood Technology كتطبيق، وفعّل الإشعارات، واختر المظهر واللغة، وتحكّم في البيانات المحفوظة على جهازك.",
      "Install the TechMood Technology site as an app, turn on notifications, choose appearance and language, and control the data saved on your device.",
    ),
  });
}

export default async function AppPage({ params }: PageProps<"/[lang]/app">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t("التطبيق", "The app")}
        title={t("TechMood على جهازك", "TechMood on your device")}
        lead={t("ثبّت الموقع كتطبيق، وفعّل الإشعارات، واضبط تفضيلاتك — كلها تُحفظ على جهازك فقط.", "Install the site as an app, turn on notifications and set your preferences — all kept on your device only.")}
        crumbs={[{ path: "/app", label: t("التطبيق والإعدادات", "App & settings") }]}
      />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container" style={{ display: "grid", gap: 16, maxWidth: 860 }}>
          <InstallCard />
          <NotificationsCard />
          <PreferencesCard />
          <LocalDataCard />
        </div>
      </section>
    </>
  );
}
