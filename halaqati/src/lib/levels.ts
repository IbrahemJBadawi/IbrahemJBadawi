/**
 * Levels and badges (pure, unit-tested). Every threshold lives here so the
 * guide page, the home page and «إنجازاتي» can never disagree.
 */
export type Level = { min: number; title: string; icon: string };

export const LEVELS: Level[] = [
  { min: 0, title: "بذرة", icon: "🌱" },
  { min: 50, title: "مثابر", icon: "🌿" },
  { min: 150, title: "مجتهد", icon: "📖" },
  { min: 400, title: "متقن", icon: "⭐" },
  { min: 800, title: "حافظ مجدّ", icon: "🌟" },
  { min: 1500, title: "نجم الحلقة", icon: "🏆" },
  { min: 3000, title: "قدوة", icon: "👑" },
];

export function levelFor(points: number) {
  const p = Math.max(0, Math.floor(points || 0));
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (p >= LEVELS[i].min) index = i;
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next ? Math.round(((p - current.min) / (next.min - current.min)) * 100) : 100;
  return { index: index + 1, current, next, toNext: next ? next.min - p : 0, progress };
}

export type BadgeStats = {
  recitations: number;
  new_ayat: number;
  review_ayat: number;
  attended: number;
  wird_days: number;
  tasks_done: number;
  certificates: number;
  reactions_received: number;
  points_total: number;
  longest_streak: number;
};

export type Badge = { key: string; icon: string; title: string; hint: string; goal: number; metric: keyof BadgeStats };

export const BADGES: Badge[] = [
  { key: "first_recitation", icon: "🎙️", title: "أول تسميع", hint: "سمّع أول مرة واعتمد المحفّظ تسميعك", goal: 1, metric: "recitations" },
  { key: "recitations_25", icon: "📿", title: "مداوم التسميع", hint: "25 تسميعًا معتمدًا", goal: 25, metric: "recitations" },
  { key: "ayat_100", icon: "📗", title: "مئة آية", hint: "احفظ 100 آية جديدة", goal: 100, metric: "new_ayat" },
  { key: "ayat_500", icon: "📚", title: "خمسمئة آية", hint: "احفظ 500 آية جديدة", goal: 500, metric: "new_ayat" },
  { key: "review_300", icon: "🔁", title: "وفيّ للمراجعة", hint: "راجع 300 آية", goal: 300, metric: "review_ayat" },
  { key: "streak_3", icon: "🔥", title: "شرارة", hint: "حماسة 3 أيام متتالية", goal: 3, metric: "longest_streak" },
  { key: "streak_7", icon: "🔥", title: "أسبوع كامل", hint: "حماسة 7 أيام متتالية", goal: 7, metric: "longest_streak" },
  { key: "streak_30", icon: "☄️", title: "شهر من الحماسة", hint: "حماسة 30 يومًا متتالية", goal: 30, metric: "longest_streak" },
  { key: "attend_10", icon: "🕌", title: "منتظم", hint: "احضر 10 جلسات", goal: 10, metric: "attended" },
  { key: "wird_7", icon: "🌙", title: "صاحب ورد", hint: "سجّل وردك 7 أيام", goal: 7, metric: "wird_days" },
  { key: "tasks_10", icon: "✅", title: "منجز", hint: "أنجز 10 مهام", goal: 10, metric: "tasks_done" },
  { key: "certificate_1", icon: "🎓", title: "أول شهادة", hint: "احصل على شهادة إنجاز", goal: 1, metric: "certificates" },
  { key: "loved_10", icon: "💚", title: "محبوب الحلقة", hint: "10 تفاعلات على إنجازاتك", goal: 10, metric: "reactions_received" },
];

export function evaluateBadges(stats: BadgeStats) {
  return BADGES.map((b) => {
    const value = Number(stats[b.metric] ?? 0);
    return { ...b, value, earned: value >= b.goal, progress: Math.min(100, Math.round((value / b.goal) * 100)) };
  });
}
