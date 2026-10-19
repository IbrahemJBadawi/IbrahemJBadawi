"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** Says so when the device is offline (pages you visited still open from the saved copy). */
export function OfflineBar() {
  const t = useT();
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div className="offline-bar" role="status">
      {t("أنت غير متصل — تعرض الصفحات التي زرتها من نسخة محفوظة على جهازك.", "You're offline — pages you've visited open from a copy saved on this device.")}
    </div>
  );
}
