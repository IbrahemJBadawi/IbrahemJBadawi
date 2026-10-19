"use client";

import { useLocale } from "@/i18n/client";
import { href } from "@/i18n/config";
import { usePath } from "./usePath";

/**
 * A plain link to /lang/[lang], which saves the choice in a cookie and
 * returns to the same page in the other language — works without JavaScript.
 */
export function LanguageSwitch({ className = "lang-switch" }: { className?: string }) {
  const locale = useLocale();
  const path = usePath();
  const other = locale === "ar" ? "en" : "ar";
  const target = `/lang/${other}?next=${encodeURIComponent(href(other, path))}`;
  return (
    <a className={className} href={target} hrefLang={other} lang={other} aria-label={other === "en" ? "Switch to English" : "التبديل إلى العربية"}>
      {other === "en" ? "EN" : "عربي"}
    </a>
  );
}
