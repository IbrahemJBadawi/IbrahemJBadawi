import Image from "next/image";
import Link from "next/link";
import { CtaBand, SectionHead, ServiceCard, VentureCard } from "@/components/Blocks";
import { Icon, type IconName } from "@/components/Icon";
import { SERVICES } from "@/data/services";
import { UPDATES } from "@/data/updates";
import { VENTURES } from "@/data/ventures";
import { href, isLocale, type Locale } from "@/i18n/config";
import { formatDate, translator } from "@/i18n/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: "/",
    title: t("TechMood Technology — نبني قادة المستقبل الرقمي", "TechMood Technology — Building Future Digital Leaders"),
    description: t(
      "الشركة الأم لمنظومة تقنية مدعومة بالذكاء الاصطناعي: خدمات الذكاء الاصطناعي والبرمجيات والتحول الرقمي، ومشاريع رقمية في التعليم والعمل والتجارة.",
      "The parent company of an AI-powered technology ecosystem: AI, software and digital transformation services, and digital ventures in education, work and commerce.",
    ),
  });
}

const ORBIT: { icon: IconName; ar: string; en: string; x: number; y: number }[] = [
  { icon: "spark", ar: "الذكاء الاصطناعي", en: "AI & Automation", x: 50, y: 6 },
  { icon: "code", ar: "البرمجيات", en: "Software", x: 92, y: 32 },
  { icon: "chart", ar: "البيانات", en: "Data & BI", x: 86, y: 78 },
  { icon: "cap", ar: "التعليم التقني", en: "Education", x: 50, y: 96 },
  { icon: "kanban", ar: "إدارة المنتجات", en: "Product & Agile", x: 12, y: 76 },
  { icon: "rocket", ar: "المشاريع الناشئة", en: "Startups", x: 9, y: 30 },
];

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);

  const method = [
    { title: t("الفكرة", "Idea"), body: t("نبدأ من المشكلة الحقيقية ومن يعاني منها، لا من التقنية.", "We start from the real problem and who has it — not from the technology.") },
    { title: t("التحليل", "Analysis"), body: t("نحدد النطاق والأولويات وما يجب أن تحققه النسخة الأولى.", "We define scope, priorities and what the first version must achieve.") },
    { title: t("التصميم والبناء", "Design & build"), body: t("نصمم تجربة واضحة ونبنيها على مراحل قصيرة قابلة للمراجعة.", "We design a clear experience and build it in short, reviewable cycles.") },
    { title: t("الإطلاق", "Launch"), body: t("ننشر بعناية، مع التوثيق والتدريب اللازمين.", "We release carefully, with the documentation and training it needs.") },
    { title: t("القياس والتحسين", "Measure & improve"), body: t("نتابع الاستخدام الفعلي ونطوّر بناءً على البيانات والملاحظات.", "We follow real usage and improve from data and feedback.") },
  ];

  const audiences: { icon: IconName; title: string; body: string; path: string; cta: string }[] = [
    {
      icon: "building",
      title: t("الشركات", "Companies"),
      body: t("أتمتة وتحليل بيانات وأنظمة رقمية تخدم طريقة عملكم.", "Automation, data and digital systems built around how you work."),
      path: "/solutions",
      cta: t("حلول الشركات", "Business solutions"),
    },
    {
      icon: "lightbulb",
      title: t("أصحاب المشاريع", "Founders"),
      body: t("من الفكرة إلى نسخة أولى قابلة للإطلاق والتجربة.", "From an idea to a first version ready to launch and test."),
      path: "/services/startup-product-development",
      cta: t("بناء المنتج", "Product building"),
    },
    {
      icon: "cap",
      title: t("المتعلمون", "Learners"),
      body: t("تعلّم عملي وإرشاد ومسارات مهنية عبر منصة TechMood.", "Practical learning, mentorship and career paths through the TechMood Platform."),
      path: "/ventures/techmood-platform",
      cta: t("منصة TechMood", "TechMood Platform"),
    },
    {
      icon: "users",
      title: t("الشركاء", "Partners"),
      body: t("نرحب بالتعاون مع المؤسسات والمبادرات التي تشاركنا الهدف.", "We welcome collaboration with institutions and initiatives that share our goals."),
      path: "/contact?type=partnership",
      cta: t("تواصل للشراكة", "Talk partnership"),
    },
  ];

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-card">
            <div className="reveal">
              <span className="eyebrow">
                <Icon name="spark" size={15} />
                <span className="ltr">AI-Powered Technology Ecosystem for the Future of Work</span>
              </span>
              <h1>
                {t("نحوّل الأفكار إلى ", "We turn ideas into ")}
                <span className="accent">{t("حلول رقمية ذكية", "intelligent digital solutions")}</span>
                {t(" تعمل فعلًا", " that work")}
              </h1>
              <p className="lead">
                {t(
                  "TechMood Technology هي الشركة الأم التي تطوّر وتدير منتجات ومشاريع وخدمات تقنية، تجمع الذكاء الاصطناعي والبرمجيات والتعليم لبناء قادة المستقبل الرقمي.",
                  "TechMood Technology is the parent company that builds and runs technology products, ventures and services — bringing AI, software and education together to build future digital leaders.",
                )}
              </p>
              <div className="hero-actions">
                <Link href={href(locale, "/services")} className="btn btn-primary">
                  {t("استكشف خدماتنا", "Explore our services")}
                  <Icon name="arrow" size={18} className="flip-rtl" />
                </Link>
                <Link href={href(locale, "/ventures")} className="btn btn-ghost">
                  {t("اكتشف مشاريعنا", "Discover our ventures")}
                </Link>
                <Link href={href(locale, "/contact")} className="btn btn-soft">
                  {t("ابدأ مشروعًا", "Start a project")}
                </Link>
              </div>
              <ul className="hero-facts">
                <li>
                  <Icon name="pin" size={16} /> {t("فلسطين", "Palestine")}
                </li>
                <li>
                  <Icon name="calendar" size={16} /> {t("تأسست في 18 يونيو 2026", "Founded 18 June 2026")}
                </li>
                <li>
                  <Icon name="globe" size={16} /> {t("العربية والإنجليزية", "Arabic & English")}
                </li>
              </ul>
            </div>
            <div className="orbit reveal reveal-2" aria-hidden="true">
              <svg className="rings" viewBox="0 0 100 100">
                <circle className="ring" cx="50" cy="50" r="44" />
                <circle className="ring dashed" cx="50" cy="50" r="31" />
                <circle className="ring" cx="50" cy="50" r="20" />
              </svg>
              <div className="orbit-core">
                <Image src="/brand/logo.png" alt="" width={160} height={160} priority />
              </div>
              {ORBIT.map((node) => (
                <span key={node.en} className="orbit-node" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
                  <Icon name={node.icon} size={15} />
                  {locale === "ar" ? node.ar : node.en}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          <SectionHead
            title={t("مجالات عملنا", "What we do")}
            lead={t("سبعة مجالات مترابطة، تجتمع لتحويل الفكرة إلى منتج أو خدمة رقمية قابلة للنمو.", "Seven connected areas that come together to turn an idea into a digital product or service that can grow.")}
            action={
              <Link href={href(locale, "/services")} className="see-all">
                {t("كل الخدمات", "All services")} <Icon name="arrow" size={16} className="flip-rtl" />
              </Link>
            }
          />
          <div className="grid grid-4 tiles-mobile">
            {SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service} locale={locale} />
            ))}
            <Link href={href(locale, "/contact?type=service")} className="card audience-card" style={{ justifyContent: "center" }}>
              <span className="icon-tile is-navy">
                <Icon name="chat" size={24} />
              </span>
              <h3>{t("لست متأكدًا من أين تبدأ؟", "Not sure where to start?")}</h3>
              <p>{t("صف لنا التحدي، ونقترح عليك المسار المناسب.", "Describe the challenge and we'll suggest the right path.")}</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHead
            title={t("المشاريع والمنتجات", "Ventures & products")}
            lead={t(
              "منتجات تطوّرها الشركة وتديرها، معروضة بحالتها الفعلية: ما هو متاح، وما هو تجريبي، وما هو قيد التطوير أو التخطيط.",
              "Products the company builds and runs, shown as they really are: what's available, what's in beta, and what's in development or planning.",
            )}
            action={
              <Link href={href(locale, "/ventures")} className="see-all">
                {t("كل المشاريع", "All ventures")} <Icon name="arrow" size={16} className="flip-rtl" />
              </Link>
            }
          />
          <div className="grid grid-3 rail-mobile">
            {VENTURES.slice(0, 3).map((venture) => (
              <VentureCard key={venture.slug} venture={venture} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            title={t("منهجيتنا: من الفكرة إلى الإطلاق والتحسين", "Our method: from idea to launch and beyond")}
            lead={t("خطوات واضحة تبقيك على اطلاع في كل مرحلة.", "Clear steps that keep you informed at every stage.")}
          />
          <ol className="steps is-5">
            {method.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHead title={t("لمن نعمل؟", "Who we work with")} />
          <div className="grid grid-4 tiles-mobile">
            {audiences.map((audience) => (
              <Link key={audience.title} href={href(locale, audience.path)} className="card audience-card">
                <span className="icon-tile is-sky">
                  <Icon name={audience.icon} size={24} />
                </span>
                <h3>{audience.title}</h3>
                <p>{audience.body}</p>
                <span className="card-foot">
                  <span className="see-all" style={{ fontSize: "0.9rem" }}>{audience.cta}</span>
                  <span className="go" aria-hidden="true">
                    <Icon name="arrow" size={17} className="flip-rtl" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            title={t("آخر المستجدات", "Latest updates")}
            lead={t("فعّل الإشعارات من جرس المستجدات لتصلك الأخبار الجديدة على جهازك.", "Turn on notifications from the updates bell to get new announcements on your device.")}
            action={
              <Link href={href(locale, "/app")} className="see-all">
                {t("الإشعارات والتطبيق", "Notifications & app")} <Icon name="arrow" size={16} className="flip-rtl" />
              </Link>
            }
          />
          <div className="grid grid-3 rail-mobile">
            {UPDATES.slice(0, 3).map((update) => (
              <Link key={update.id} href={href(locale, update.path)} className="card">
                <time dateTime={update.date} style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {formatDate(locale, update.date)}
                </time>
                <h3>{update.title[locale]}</h3>
                <p>{update.body[locale]}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand locale={locale} />
    </>
  );
}
