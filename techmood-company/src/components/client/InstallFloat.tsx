"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { href } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { promptInstall, useInstallState } from "@/lib/install-client";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/storage";
import { usePath } from "./usePath";

const DISMISS_DAYS = 14;

/**
 * «ثبّت TechMood كتطبيق» — a small card after the page settles. Hidden when
 * already installed, on /app (which explains installing), and for two weeks
 * after it is closed. One tap where the browser allows it; the Safari steps
 * on iPhone; elsewhere a link to /app.
 */
export function InstallFloat() {
  const t = useT();
  const locale = useLocale();
  const path = usePath();
  const { installed, canPrompt, apple } = useInstallState();
  const [shown, setShown] = useState(false);
  const [steps, setSteps] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const dismissedAt = readStorage<number>(STORAGE_KEYS.installDismissed, 0);
      setShown(Date.now() - dismissedAt >= DISMISS_DAYS * 864e5);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  if (installed || !shown || path === "/app" || path === "/contact") return null;

  function close() {
    writeStorage(STORAGE_KEYS.installDismissed, Date.now());
    setShown(false);
  }

  async function install() {
    if (canPrompt) {
      if (await promptInstall()) setShown(false);
    } else if (apple) setSteps(true);
  }

  return (
    <aside className="install-float" aria-label={t("تثبيت التطبيق", "Install the app")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-mark.png" alt="" width={44} height={44} />
      <div className="text">
        <strong>{t("ثبّت TechMood على جهازك", "Install TechMood on your device")}</strong>
        <span>
          {steps
            ? t("في Safari: اضغط زر المشاركة ⬆︎ ثم «إضافة إلى الشاشة الرئيسية».", "In Safari: tap Share ⬆︎, then “Add to Home Screen”.")
            : t("يفتح من الشاشة الرئيسية، ويعمل دون اتصال للصفحات التي زرتها.", "Opens from your home screen and works offline for pages you've visited.")}
        </span>
      </div>
      {canPrompt || apple ? (
        !steps && (
          <button type="button" className="btn btn-primary btn-sm" onClick={install}>
            <Icon name="download" size={16} />
            {t("ثبّت", "Install")}
          </button>
        )
      ) : (
        <Link className="btn btn-primary btn-sm" href={href(locale, "/app")}>
          {t("كيف؟", "How?")}
        </Link>
      )}
      <button type="button" className="close" onClick={close} aria-label={t("إغلاق", "Close")}>
        <Icon name="close" size={16} />
      </button>
    </aside>
  );
}
