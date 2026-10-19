"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { href } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";

export default function NotFound() {
  const t = useT();
  const locale = useLocale();
  return (
    <section className="container state">
      <span className="code">404</span>
      <h1>{t("الصفحة غير موجودة", "Page not found")}</h1>
      <p>{t("ربما تغيّر الرابط أو كُتب بشكل خاطئ. جرّب إحدى هذه الصفحات:", "The link may have changed or been mistyped. Try one of these pages:")}</p>
      <div className="hero-actions" style={{ justifyContent: "center", marginTop: 8 }}>
        <Link href={href(locale, "/")} className="btn btn-primary">
          <Icon name="home" size={18} />
          {t("الرئيسية", "Home")}
        </Link>
        <Link href={href(locale, "/services")} className="btn btn-ghost">
          {t("الخدمات", "Services")}
        </Link>
        <Link href={href(locale, "/ventures")} className="btn btn-ghost">
          {t("المشاريع", "Ventures")}
        </Link>
      </div>
    </section>
  );
}
