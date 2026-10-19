"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { UPDATES } from "@/data/updates";
import { href } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { STORAGE_KEYS, useStored } from "@/lib/storage";
import { useNotifyPermission } from "@/lib/notify-client";

/** Unseen updates: not marked seen on this device. */
export function useUnseenUpdates() {
  const [seen, setSeen] = useStored<string[]>(STORAGE_KEYS.seenUpdates, []);
  const [firstVisit] = useStored<string | null>(STORAGE_KEYS.firstVisit, null);
  const unseen = useMemo(() => {
    // News from long before someone's first visit is history, not news.
    const cutoff = firstVisit ? new Date(firstVisit).getTime() - 60 * 864e5 : 0;
    return UPDATES.filter((update) => !seen.includes(update.id) && new Date(update.date).getTime() >= cutoff);
  }, [seen, firstVisit]);
  const markAll = () => setSeen(UPDATES.map((update) => update.id));
  return { unseen, markAll };
}

export function UpdatesBell() {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const { unseen, markAll } = useUnseenUpdates();
  const permission = useNotifyPermission();
  const wrap = useRef<HTMLDivElement>(null);
  const unseenIds = unseen.map((update) => update.id);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <button
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        aria-label={unseen.length ? t(`المستجدات، ${unseen.length} جديدة`, `Updates, ${unseen.length} new`) : t("المستجدات", "Updates")}
      >
        <Icon name="bell" size={19} />
        {unseen.length > 0 && <span className="dot-badge" aria-hidden="true">{unseen.length}</span>}
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label={t("المستجدات", "Updates")}>
          <div className="popover-head">
            <h2>{t("المستجدات", "Updates")}</h2>
            {unseen.length > 0 && (
              <button type="button" className="link-btn" onClick={markAll}>
                {t("تعليم الكل كمقروء", "Mark all as read")}
              </button>
            )}
          </div>
          {UPDATES.map((update) => (
            <Link key={update.id} href={href(locale, update.path)} className="update-item" onClick={() => setOpen(false)}>
              <span className="meta">
                <time dateTime={update.date}>{date.format(new Date(`${update.date}T00:00:00Z`))}</time>
                {unseenIds.includes(update.id) && <span className="new-pill">{t("جديد", "New")}</span>}
              </span>
              <strong>{update.title[locale]}</strong>
              <p>{update.body[locale]}</p>
            </Link>
          ))}
          <div className="popover-foot">
            <span>
              {permission === "granted"
                ? t("إشعارات الجهاز مفعّلة لهذا الموقع.", "Device notifications are on for this site.")
                : t("فعّل الإشعارات لتصلك المستجدات على جهازك.", "Turn on notifications to get updates on your device.")}
            </span>
            <Link href={href(locale, "/app")} className="link-btn" onClick={() => setOpen(false)}>
              {t("الإعدادات", "Settings")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
