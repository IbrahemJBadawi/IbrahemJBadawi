"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { NAV, isActive } from "@/config/nav";
import { href } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeChoicePicker } from "./ThemeToggle";
import { usePath } from "./usePath";

/** The phone menu: a bottom sheet with every page, the language and the appearance. */
export function MobileMenu() {
  const t = useT();
  const locale = useLocale();
  const path = usePath();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button type="button" className="icon-btn menu-btn" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)} aria-label={t("القائمة", "Menu")}>
        <Icon name="menu" size={20} />
      </button>
      {open && (
        <>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="sheet" id="mobile-menu" role="dialog" aria-modal="true" aria-label={t("القائمة", "Menu")}>
            <div className="sheet-grip" aria-hidden="true" />
            <nav className="sheet-nav" aria-label={t("صفحات الموقع", "Site pages")}>
              {[...NAV, { path: "/app", label: { ar: "التطبيق والإعدادات", en: "App & settings" }, icon: "phone" as const }].map((item) => (
                <Link key={item.path} href={href(locale, item.path)} aria-current={isActive(path, item.path) ? "page" : undefined} onClick={() => setOpen(false)}>
                  <Icon name={item.icon} size={20} />
                  {item.label[locale]}
                </Link>
              ))}
            </nav>
            <div className="sheet-section">
              <h2>{t("اللغة", "Language")}</h2>
              <LanguageSwitch className="btn btn-ghost btn-sm" />
            </div>
            <div className="sheet-section">
              <h2>{t("المظهر", "Appearance")}</h2>
              <ThemeChoicePicker />
            </div>
            <div className="sheet-section">
              <button type="button" className="btn btn-soft" style={{ width: "100%" }} onClick={() => setOpen(false)}>
                {t("إغلاق", "Close")}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
