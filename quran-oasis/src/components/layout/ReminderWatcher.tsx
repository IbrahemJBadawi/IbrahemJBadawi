"use client";

/**
 * تذكيرات لطيفة داخل التطبيق: تعمل فقط أثناء فتح المنصة (أو تثبيتها كتطبيق وفتحها)،
 * وبعد موافقة المستخدم صراحة من الإعدادات. لا تُرسل أي تذكيرات من الخادم.
 * تُعرض مرة واحدة يوميًا لكل نوع، خلال ساعتين من الوقت المحدد، وفقط إن لم يُنجز العمل بعد.
 */
import { useEffect } from "react";
import { ADHKAR } from "@/content/adhkar";
import { dayKey } from "@/lib/date";
import { challengeIsActive } from "@/lib/challenges";
import { adhkarStatus, goalProgress } from "@/lib/store/progress";
import { getState } from "@/lib/store/store";
import { useToast } from "@/components/ui/Toast";

const MESSAGES = {
  morning: "حان وقت أذكار الصباح — دقائق تبدأ بها يومك بطمأنينة.",
  evening: "حان وقت أذكار المساء.",
  reading: "وردك اليومي ينتظرك، ولو آيات قليلة.",
  khalwa: "وقت خلوة هادئة للذكر والقرآن والتدبّر، بحسب الوقت الذي اخترته.",
  challenge: "هل سجّلت إنجاز اليوم في تحدّي «خليلي»؟",
} as const;

type Kind = keyof typeof MESSAGES;

function minutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

async function showSystemReminder(body: string) {
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification("واحة القرآن", { body, icon: "/icons/icon-192.png", lang: "ar", dir: "rtl", tag: "quran-oasis-reminder" });
        return;
      }
    }
    new Notification("واحة القرآن", { body, icon: "/icons/icon-192.png", lang: "ar", dir: "rtl" });
  } catch {
    // المتصفح قد لا يسمح بإشعارات النظام؛ تبقى تذكيرات داخل التطبيق متاحة.
  }
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
        const activeChallenges = Object.values(s.challenges).filter((c) => challengeIsActive(c, today));
        if (kind === "challenge" && activeChallenges.length === 0) return;
        const done = kind === "reading"
          ? goalProgress(s, today).reached
          : kind === "khalwa"
            ? Boolean(s.khalwa[today]?.finishedAt)
            : kind === "challenge"
              ? activeChallenges.every((c) => c.myCheckins[today])
              : adhkarStatus(ADHKAR, s, kind, today).complete;
        if (done) return;
        const message = kind === "khalwa" && s.khalwa[today]?.completedStages.length
          ? `أكملت ${s.khalwa[today].completedStages.length} من ٧ خطوات في خلوتك؛ أكملها على مهل.`
          : kind === "challenge" && now.getDay() === 5
            ? "يوم الجمعة: تابع هدفك مع خليلك إن رغبت، وبلا ضغط."
            : MESSAGES[kind];
        // لا نعتبر تذكيرًا مخفيًا قد أُرسل إن رفض الجهاز إذن إشعارات النظام.
        if (document.visibilityState === "hidden" && (!("Notification" in window) || Notification.permission !== "granted")) return;
        try {
          localStorage.setItem(key, "1");
        } catch {}
        if (document.visibilityState === "hidden" && "Notification" in window && Notification.permission === "granted") {
          void showSystemReminder(message);
        } else {
          toast(message, "info");
        }
      });
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [toast]);
  return null;
}
