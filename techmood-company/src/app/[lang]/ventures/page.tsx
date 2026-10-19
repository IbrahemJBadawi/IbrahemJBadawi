import { CtaBand, PageHero, SectionHead, VentureCard } from "@/components/Blocks";
import { StatusBadge } from "@/components/StatusBadge";
import { VentureFilter } from "@/components/client/VentureFilter";
import { STATUS_ORDER, VENTURES } from "@/data/ventures";
import { isLocale, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";
import { statusDescription } from "@/lib/status";

export async function generateMetadata({ params }: PageProps<"/[lang]/ventures">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: "/ventures",
    title: t("المشاريع", "Ventures"),
    description: t(
      "محفظة مشاريع TechMood Technology: منصة TechMood، حلقتي، منصة الجمال، TechMood Growth، وواحة القرآن — بحالتها الفعلية.",
      "TechMood Technology's venture portfolio: TechMood Platform, Halaqati, Al Jamal, TechMood Growth and Wahat Al-Quran — shown with their real status.",
    ),
  });
}

export default async function VenturesPage({ params }: PageProps<"/[lang]/ventures">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  const ventures = [...VENTURES].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t("محفظة المشاريع", "Portfolio")}
        title={t("مشاريع تبنيها TechMood وتديرها", "Ventures TechMood builds and runs")}
        lead={t(
          "لكل مشروع حالته الحقيقية. تابع ما يهمك ليُحفظ على جهازك وتصلك إشعارات عند تغيّر حالته.",
          "Every venture is shown with its real status. Follow the ones you care about — saved on your device, with a notification when their status changes.",
        )}
        crumbs={[{ path: "/ventures", label: t("المشاريع", "Ventures") }]}
      />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <VentureFilter
            items={ventures.map((venture) => ({ slug: venture.slug, status: venture.status }))}
            cards={ventures.map((venture) => <VentureCard key={venture.slug} venture={venture} locale={locale} />)}
          />
        </div>
      </section>
      <section className="section section-soft">
        <div className="container">
          <SectionHead title={t("ماذا تعني الحالات؟", "What the statuses mean")} />
          <div className="grid grid-4">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="card">
                <StatusBadge status={status} locale={locale} />
                <p>{statusDescription(status, locale)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand
        locale={locale}
        title={t("مهتم بأحد مشاريعنا؟", "Interested in one of our ventures?")}
        body={t("للشراكة أو التجربة المبكرة أو الاستفسار، راسلنا وحدد المشروع.", "For partnership, early access or questions, write to us and name the venture.")}
      />
    </>
  );
}
