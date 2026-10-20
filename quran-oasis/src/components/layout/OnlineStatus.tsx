"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-gold-soft px-4 py-2 text-center text-sm font-semibold text-gold-fg">
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      أنت غير متصل. يمكنك متابعة ما حُفظ على جهازك، وسيُزامن تقدمك عند عودة الاتصال.
    </div>
  );
}
