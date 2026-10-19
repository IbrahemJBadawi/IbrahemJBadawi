import Link from "next/link";
import { CtaBand, PageHero } from "@/components/Blocks";
import { Icon } from "@/components/Icon";
import { getService } from "@/data/services";
import { SOLUTIONS } from "@/data/solutions";
import { href, isLocale, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/solutions">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: "/solutions",
    title: t("الحلول", "Solutions"),
    description: t(
      "كيف تساعد TechMood Technology الشركات الصغيرة والمتوسطة ورواد الأعمال والمؤسسات التعليمية والمشاريع الناشئة والأفراد في بناء حلول رقمية.",
      "How TechMood Technology helps small and medium businesses, entrepreneurs, educational institutions, startups and individuals build digital solutions.",
    ),
  });
}

export default async function SolutionsPage({ params }: PageProps<"/[lang]/solutions">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t("حلول حسب الفئة", "Solutions by audience")}
        title={t("حلول تناسب مرحلتك واحتياجك", "Solutions for where you are and what you need")}
        lead={t("ابحث عن فئتك لترى التحدي الذي نفهمه، وكيف يمكن أن نساعد، والخدمات المرتبطة.", "Find your group to see the challenge we understand, how we can help and the related services.")}
        crumbs={[{ path: "/solutions", label: t("الحلول", "Solutions") }]}
      >
        <div className="ticker" style={{ marginTop: 20 }}>
          {SOLUTIONS.map((solution) => (
            <a key={solution.id} href={`#${solution.id}`} className="chip">
              <Icon name={solution.icon} size={16} />
              {solution.title[locale]}
            </a>
          ))}
        </div>
      </PageHero>
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container" style={{ display: "grid", gap: 16 }}>
          {SOLUTIONS.map((solution) => (
            <article key={solution.id} id={solution.id} className="card" style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span className="icon-tile">
                  <Icon name={solution.icon} size={24} />
                </span>
                <h2 style={{ fontSize: "1.3rem" }}>{solution.title[locale]}</h2>
              </div>
              <div className="grid grid-2" style={{ gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: "0.95rem", color: "var(--muted)", fontWeight: 600 }}>{t("التحدي", "The challenge")}</h3>
                  <p style={{ color: "var(--ink-2)", marginTop: 4 }}>{solution.challenge[locale]}</p>
                </div>
                <div>
                  <h3 style={{ fontSize: "0.95rem", color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>{t("كيف نساعد", "How we help")}</h3>
                  <ul className="check-list">
                    {solution.howWeHelp[locale].map((item) => (
                      <li key={item}>
                        <Icon name="check" size={18} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {solution.services.map((slug) => {
                  const service = getService(slug);
                  return service ? (
                    <Link key={slug} href={href(locale, `/services/${slug}`)} className="chip">
                      <Icon name={service.icon} size={15} />
                      {service.title[locale]}
                    </Link>
                  ) : null;
                })}
                <Link href={href(locale, `/contact?type=service&topic=${solution.id}`)} className="btn btn-primary btn-sm" style={{ marginInlineStart: "auto" }}>
                  {t("ناقش احتياجك", "Discuss your needs")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <CtaBand locale={locale} />
    </>
  );
}
