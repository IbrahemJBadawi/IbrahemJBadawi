"use client";

/**
 * تذكيرات لطيفة داخل التطبيق: تعمل فقط أثناء فتح المنصة (أو تثبيتها كتطبيق وفتحها)،
 * وبعد موافقة المستخدم صراحة من الإعدادات. لا تُرسل أي تذكيرات من الخادم.
 * تُعرض مرة واحدة يوميًا لكل نوع، خلال ساعتين من الوقت المحدد، وفقط إن لم يُنجز العمل بعد.
 */
import { useEffect } from "react";
import { ADHKAR } from "@/content/adhkar";
import { dayKey } from "@/lib/date";
import { adhkarStatus, goalProgress } from "@/lib/store/progress";
import { getState } from "@/lib/store/store";
import { useToast } from "@/components/ui/Toast";

const MESSAGES = {
  morning: "حان وقت أذكار الصباح — دقائق تبدأ بها يومك بطمأنينة.",
  evening: "حان وقت أذكار المساء.",
  reading: "وردك اليومي ينتظرك، ولو آيات قليلة.",
} as const;

type Kind = keyof typeof MESSAGES;

function minutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function ReminderWatcher() {
  const toast = useToast();
  useEffect(() => {
    const check = () => {
      const s = getState();
      const r = s.settings.reminders;
      if (!r.enabled) return;
      const now = new Date();
      if (!r.days.includes(now.getDay())) return;
      const today = dayKey(now);
      const cur = now.getHours() * 60 + now.getMinutes();
      (Object.keys(MESSAGES) as Kind[]).forEach((kind) => {
        const t = r[kind];
        if (!t) return;
        const diff = cur - minutes(t);
        if (diff < 0 || diff > 120) return;
        const key = `qo:reminded:${today}:${kind}`;
        try {
          if (localStorage.getItem(key)) return;
        } catch {
          return;
        }
        const done =
          kind === "reading"
            ? goalProgress(s, today).reached
            : adhkarStatus(ADHKAR, s, kind, today).complete;
        if (done) return;
        try {
          localStorage.setItem(key, "1");
        } catch {}
        if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
          new Notification("واحة القرآن", { body: MESSAGES[kind], icon: "/icons/icon-192.png", lang: "ar", dir: "rtl" });
        } else {
          toast(MESSAGES[kind], "info");
        }
      });
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [toast]);
  return null;
}
