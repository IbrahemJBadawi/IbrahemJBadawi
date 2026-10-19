"use client";

import { Icon } from "@/components/Icon";
import { useT } from "@/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <section className="container state" role="alert">
      <span className="icon-tile" style={{ width: 64, height: 64 }}>
        <Icon name="refresh" size={28} />
      </span>
      <h1>{t("حدث خطأ غير متوقع", "Something went wrong")}</h1>
      <p>{t("لم نتمكن من عرض هذه الصفحة الآن. حاول مرة أخرى، وإن تكرر الخطأ فراسلنا.", "We couldn't show this page right now. Please try again, and let us know if it keeps happening.")}</p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        {t("إعادة المحاولة", "Try again")}
      </button>
    </section>
  );
}
