import Image from "next/image";
import Link from "next/link";
import { CtaBand, PageHero, SectionHead } from "@/components/Blocks";
import { Icon, type IconName } from "@/components/Icon";
import { COMPANY, FOUNDER_LINKS } from "@/config/company";
import { VENTURES } from "@/data/ventures";
import { href, isLocale, type Locale } from "@/i18n/config";
import { formatDate, translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: "/about",
    title: t("عن الشركة", "About the company"),
    description: t(
      "تعرّف على TechMood Technology: رؤيتها ورسالتها وقيمها، ودورها كشركة أم تطوّر وتدير المنتجات الرقمية، ومؤسسها إبراهيم جمال حافظ بدوي.",
      "Meet TechMood Technology: its vision, mission and values, its role as a parent company building digital products, and its founder, Ibrahem Jamal Hafez Badawi.",
    ),
  });
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);

  const values: { icon: IconName; title: string; body: string }[] = [
    { icon: "lightbulb", title: t("الابتكار", "Innovation"), body: t("نبحث عن حلول جديدة لمشكلات حقيقية، ونستخدم التقنية حيث تضيف قيمة.", "We look for new answers to real problems, and use technology where it adds value.") },
    { icon: "shield", title: t("الجودة", "Quality"), body: t("نبني منتجات موثوقة وآمنة، ونهتم بالتفاصيل التي يلاحظها المستخدم.", "We build reliable, secure products and care about the details users notice.") },
    { icon: "refresh", title: t("التعلم المستمر", "Continuous learning"), body: t("نتعلم من كل مشروع ومن كل مستخدم، ونطوّر أنفسنا وما نبنيه.", "We learn from every project and every user, and keep improving ourselves and what we build.") },
    { icon: "target", title: t("التنفيذ العملي", "Practical execution"), body: t("نفضّل النسخة العاملة على الخطة المثالية، ونتقدم بخطوات قابلة للقياس.", "We prefer a working version to a perfect plan, and move in measurable steps.") },
    { icon: "users", title: t("التعاون", "Collaboration"), body: t("نعمل مع عملائنا وشركائنا كفريق واحد بوضوح وشفافية.", "We work with clients and partners as one team, with clarity and transparency.") },
  ];

  const domains = [
    t("الذكاء الاصطناعي وأتمتة الأعمال", "Artificial Intelligence & AI Automation"),
    t("تطوير البرمجيات وتطبيقات الويب", "Software & Web Application Development"),
    t("التحول الرقمي", "Digital Transformation"),
    t("تحليل البيانات وذكاء الأعمال", "Data Analytics & Business Intelligence"),
    t("إدارة المنتجات التقنية", "Technical Product Management"),
    t("إدارة المشاريع والفرق الرشيقة", "Agile Project & Team Management"),
    t("التعليم التقني والمهارات الرقمية", "Technology Education & Digital Skills"),
    t("بناء المشاريع الناشئة والحلول الرقمية للأعمال", "Startup Building & Digital Business Solutions"),
  ];

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t("الشركة الأم", "The parent company")}
        title={t("من نحن", "Who we are")}
        lead={t(
          "TechMood Technology شركة تقنية تأسست في فلسطين، تطوّر وتدير منتجات ومشاريع وخدمات رقمية تقوم على الذكاء الاصطناعي والبرمجيات والتعليم.",
          "TechMood Technology is a technology company founded in Palestine that builds and runs digital products, ventures and services grounded in AI, software and education.",
        )}
        crumbs={[{ path: "/about", label: t("الشركة", "Company") }]}
      />

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container detail">
          <div>
            <div className="card prose-card">
              <h2>{t("الرؤية", "Vision")}</h2>
              <p>
                {t(
                  "أن نكون منظومة تقنية عربية مدعومة بالذكاء الاصطناعي، تُعدّ الأفراد والمؤسسات لمستقبل العمل وتبني قادة المستقبل الرقمي.",
                  "To be an Arab, AI-powered technology ecosystem that prepares people and organisations for the future of work and builds future digital leaders.",
                )}
              </p>
            </div>
            <div className="card prose-card">
              <h2>{t("الرسالة", "Mission")}</h2>
              <p>
                {t(
                  "تحويل الأفكار إلى حلول رقمية عملية: منتجات نطوّرها ونديرها بأنفسنا، وخدمات نقدمها للشركات وأصحاب المشاريع، وتعليم يربط المتعلمين بمهارات يحتاجها سوق العمل.",
                  "Turning ideas into practical digital solutions: products we build and run ourselves, services for businesses and founders, and education that connects learners with the skills the job market needs.",
                )}
              </p>
            </div>
            <div className="card prose-card">
              <h2>{t("دور الشركة الأم", "The parent company's role")}</h2>
              <p>
                {t(
                  "تحتضن TechMood Technology مشاريعها الرقمية تحت مظلة واحدة: تضع الرؤية والمعايير التقنية، وتبني المنتجات وتشغّلها، وتنقل الخبرة من مشروع إلى آخر. لكل مشروع جمهوره وحالته الخاصة، ونعرضها بصدق كما هي.",
                  "TechMood Technology brings its digital ventures under one roof: it sets the vision and technical standards, builds and runs the products, and carries know-how from one venture to the next. Each venture has its own audience and its own status, and we present them honestly as they are.",
                )}
              </p>
              <Link href={href(locale, "/ventures")} className="see-all" style={{ marginTop: 6 }}>
                {t(`استعرض ${VENTURES.length} مشاريع`, `See ${VENTURES.length} ventures`)} <Icon name="arrow" size={16} className="flip-rtl" />
              </Link>
            </div>
          </div>
          <aside className="card">
            <Image
              src="/brand/techmood-identity.webp"
              alt={t("شعار TechMood Technology", "TechMood Technology logo")}
              width={800}
              height={800}
              style={{ borderRadius: 20, width: "100%", height: "auto" }}
              sizes="(min-width: 980px) 340px, 100vw"
            />
            <dl className="fact-list">
              <div>
                <dt>{t("الاسم", "Name")}</dt>
                <dd className="ltr" style={{ textAlign: "start" }}>{COMPANY.name}</dd>
              </div>
              <div>
                <dt>{t("الشعار", "Tagline")}</dt>
                <dd className="ltr" style={{ textAlign: "start" }}>{COMPANY.tagline}</dd>
              </div>
              <div>
                <dt>{t("التأسيس", "Founded")}</dt>
                <dd>{formatDate(locale, COMPANY.foundingDate)}</dd>
              </div>
              <div>
                <dt>{t("الموقع", "Location")}</dt>
                <dd>{t("فلسطين", "Palestine")}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHead title={t("قيمنا", "Our values")} />
          <div className="grid grid-3">
            {values.map((value) => (
              <div key={value.title} className="card">
                <span className="icon-tile">
                  <Icon name={value.icon} size={24} />
                </span>
                <h3>{value.title}</h3>
                <p>{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead title={t("مجالات الشركة", "Our fields")} lead={t("المجالات التي تعمل فيها الشركة وتبني فيها خبرتها.", "The fields the company works in and builds its expertise around.")} />
          <ul className="grid grid-2 check-list" style={{ gap: 12 }}>
            {domains.map((domain) => (
              <li key={domain} className="card" style={{ flexDirection: "row", padding: 18 }}>
                <Icon name="check" size={18} />
                {domain}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHead title={t("المؤسس", "Founder")} />
          <div className="card" style={{ flexDirection: "row", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
            <span className="icon-tile is-navy" style={{ width: 72, height: 72, borderRadius: 22 }}>
              <Icon name="user" size={32} />
            </span>
            <div style={{ flex: "1 1 280px" }}>
              <h3>{locale === "ar" ? COMPANY.founderAr : COMPANY.founder}</h3>
              <p style={{ color: "var(--royal)", fontWeight: 600 }}>{t("المؤسس والرئيس التنفيذي", "Founder & CEO")}</p>
              <p style={{ marginTop: 8 }}>
                {t(
                  "خريج نظم المعلومات الإدارية، وحاصل على ماجستير إدارة الأعمال في الذكاء الاصطناعي. يهتم بالذكاء الاصطناعي وتحليل البيانات وتطوير الويب والتحول الرقمي، وأسّس TechMood Technology لتجمع هذه المجالات في منظومة واحدة.",
                  "A Management Information Systems graduate with an MBA in AI, focused on AI, data analytics, web development and digital transformation — and the founder of TechMood Technology, created to bring these fields together in one ecosystem.",
                )}
              </p>
            </div>
            <div className="sheet-row">
              {FOUNDER_LINKS.map((link) => (
                <a key={link.key} href={link.href} className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer">
                  <Icon name={link.key} size={17} />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CtaBand locale={locale} />
    </>
  );
}
