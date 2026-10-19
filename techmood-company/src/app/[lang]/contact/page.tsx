import { PageHero } from "@/components/Blocks";
import { Icon } from "@/components/Icon";
import { ContactForm } from "@/components/client/ContactForm";
import { CONTACT, SOCIAL_LINKS } from "@/config/company";
import { getService } from "@/data/services";
import { SOLUTIONS } from "@/data/solutions";
import { getVenture } from "@/data/ventures";
import { isLocale, type Locale } from "@/i18n/config";
import { translator } from "@/i18n/server";
import { REQUEST_TYPES } from "@/lib/contact/validate";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  return pageMetadata({
    locale,
    path: "/contact",
    title: t("تواصل معنا", "Contact us"),
    description: t(
      "ابدأ مشروعًا أو اطلب خدمة أو اقترح شراكة مع TechMood Technology عبر نموذج التواصل أو البريد أو Telegram.",
      "Start a project, request a service or propose a partnership with TechMood Technology through the contact form, email or Telegram.",
    ),
  });
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactPage({ params, searchParams }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const t = translator(locale);
  const query = await searchParams;

  const type = one(query.type);
  const initialType = type && (REQUEST_TYPES as readonly string[]).includes(type) ? type : undefined;
  // Only known topics are echoed back — never free text from the URL.
  const topicSlug = one(query.topic) ?? "";
  const topicLabel =
    getService(topicSlug)?.title[locale] ?? getVenture(topicSlug)?.name[locale] ?? SOLUTIONS.find((solution) => solution.id === topicSlug)?.title[locale];
  const topic = topicLabel ? topicSlug : undefined;

  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t("تواصل", "Contact")}
        title={t("لنتحدث عن مشروعك", "Let's talk about your project")}
        lead={t(
          "أخبرنا بما تحتاجه، وسنعود إليك عبر بريدك الإلكتروني. لا يلزمك تحديد التفاصيل التقنية — يكفي أن تصف الهدف.",
          "Tell us what you need and we'll get back to you by email. You don't need the technical details — describing the goal is enough.",
        )}
        crumbs={[{ path: "/contact", label: t("تواصل", "Contact") }]}
      />
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container detail">
          <div className="card" style={{ padding: "clamp(20px, 3vw, 32px)" }}>
            <ContactForm initialType={initialType} topic={topic} topicLabel={topicLabel} />
          </div>
          <aside style={{ display: "grid", gap: 12 }}>
            <h2 style={{ fontSize: "1.05rem" }}>{t("قنوات التواصل الرسمية", "Official channels")}</h2>
            <a className="channel" href={`mailto:${CONTACT.email}`}>
              <span className="icon-tile">
                <Icon name="mail" size={22} />
              </span>
              <span>
                <small>{t("البريد الإلكتروني", "Email")}</small>
                <strong className="ltr">{CONTACT.email}</strong>
              </span>
            </a>
            <a className="channel" href={CONTACT.telegramChannel.href} target="_blank" rel="noopener noreferrer">
              <span className="icon-tile is-sky">
                <Icon name="telegram" size={22} />
              </span>
              <span>
                <small>{t("قناة الشركة على Telegram", "Company channel on Telegram")}</small>
                <strong className="ltr">{CONTACT.telegramChannel.handle}</strong>
              </span>
            </a>
            <a className="channel" href={CONTACT.telegramCommunity.href} target="_blank" rel="noopener noreferrer">
              <span className="icon-tile is-sky">
                <Icon name="users" size={22} />
              </span>
              <span>
                <small>{t("مجتمع TechMood على Telegram", "TechMood community on Telegram")}</small>
                <strong className="ltr">{CONTACT.telegramCommunity.handle}</strong>
              </span>
            </a>
            <div className="card" style={{ padding: 18 }}>
              <p style={{ fontSize: "0.9rem" }}>{t("تابع TechMood على:", "Follow TechMood on:")}</p>
              <div className="socials" style={{ marginTop: 4 }}>
                {SOCIAL_LINKS.map((link) => (
                  <a key={link.key} className="icon-btn" href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
                    <Icon name={link.key} size={18} />
                  </a>
                ))}
              </div>
            </div>
            <p className="note">
              <Icon name="pin" size={18} />
              {t("نعمل من فلسطين، ونتعاون عن بُعد.", "We work from Palestine and collaborate remotely.")}
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
