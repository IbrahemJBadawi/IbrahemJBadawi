"use client";

import { useEffect } from "react";
import { UPDATES } from "@/data/updates";
import { VENTURES } from "@/data/ventures";
import { href } from "@/i18n/config";
import { useLocale } from "@/i18n/client";
import "@/lib/install-client"; // registers the service worker and catches the install offer
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/storage";
import { notificationsOn, showNotification } from "@/lib/notify-client";
import { statusLabel } from "@/lib/status";

/**
 * Runs once per visit, invisibly:
 *   - remembers the first visit (so old news isn't shown as new);
 *   - if notifications are on, notifies about news not yet notified, and
 *     about followed ventures whose status changed since they were followed.
 * Everything it remembers stays in this browser's local storage.
 */
export function DeviceWatcher() {
  const locale = useLocale();

  useEffect(() => {
    if (!readStorage<string | null>(STORAGE_KEYS.firstVisit, null)) {
      writeStorage(STORAGE_KEYS.firstVisit, new Date().toISOString().slice(0, 10));
    }
    if (!notificationsOn()) return;

    void (async () => {
      const notified = readStorage<string[]>(STORAGE_KEYS.notifiedUpdates, []);
      const seen = readStorage<string[]>(STORAGE_KEYS.seenUpdates, []);
      const fresh = UPDATES.filter((update) => !notified.includes(update.id) && !seen.includes(update.id)).slice(0, 3);
      for (const update of fresh) {
        await showNotification(update.title[locale], update.body[locale], href(locale, update.path), locale);
      }
      if (fresh.length) writeStorage(STORAGE_KEYS.notifiedUpdates, [...notified, ...fresh.map((update) => update.id)]);

      const following = readStorage<Record<string, string>>(STORAGE_KEYS.following, {});
      let changed = false;
      for (const venture of VENTURES) {
        const before = following[venture.slug];
        if (before && before !== venture.status) {
          await showNotification(
            venture.name[locale],
            locale === "ar"
              ? `تغيّرت حالة المشروع إلى: ${statusLabel(venture.status, locale)}`
              : `Status changed to: ${statusLabel(venture.status, locale)}`,
            href(locale, `/ventures/${venture.slug}`),
            locale,
          );
          following[venture.slug] = venture.status;
          changed = true;
        }
      }
      if (changed) writeStorage(STORAGE_KEYS.following, following);
    })();
  }, [locale]);

  return null;
}
