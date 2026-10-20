import type { Metadata } from "next";
import { Prose } from "@/components/layout/Prose";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "تواصل معنا", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <Prose title="تواصل معنا">
      <p>يسعدنا تواصلك، سواء لاقتراح أو لملاحظة أو للإبلاغ عن خطأ في المحتوى.</p>
      {SITE.contactEmail ? (
        <p>
          البريد الإلكتروني:{" "}
          <a href={`mailto:${SITE.contactEmail}`} dir="ltr">
            {SITE.contactEmail}
          </a>
        </p>
      ) : (
        <p className="rounded-2xl bg-gold-soft p-4 text-gold-fg">سيُضاف بريد التواصل الرسمي قريبًا.</p>
      )}
      <h2>الإبلاغ عن خطأ في المحتوى</h2>
      <p>عند الإبلاغ عن خطأ، اذكر الصفحة واسم السورة ورقم الآية أو اسم الذكر، ليتمكن فريق المحتوى من مراجعته سريعًا.</p>
    </Prose>
  );
}
