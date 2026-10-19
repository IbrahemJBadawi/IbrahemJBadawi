import Link from "next/link";
import type { ContextKey } from "@/lib/roles";

type Action = { href: string; label: string; icon: string; tint: string };

const ACTIONS: Partial<Record<ContextKey, Action[]>> = {
  student: [
    { href: "/dashboard#wird", label: "ورد اليوم", icon: "📖", tint: "t-mint" },
    { href: "/dashboard/journey", label: "رحلتي", icon: "🧭", tint: "t-sky" },
    { href: "/dashboard/tasks", label: "مهامي", icon: "✅", tint: "t-sand" },
    { href: "/dashboard/league", label: "الدوري", icon: "🏆", tint: "t-rose" },
    { href: "/dashboard/messages", label: "الرسائل", icon: "💬", tint: "t-lilac" },
    { href: "/dashboard/achievements", label: "إنجازاتي", icon: "🎖️", tint: "t-peach" },
    { href: "/dashboard/certificates", label: "شهاداتي", icon: "🎓", tint: "t-sand" },
    { href: "/dashboard/schedule", label: "جدولي", icon: "🗓️", tint: "t-mint" },
  ],
  quran_teacher: [
    { href: "/dashboard/teacher/halaqat", label: "حلقاتي", icon: "🕌", tint: "t-mint" },
    { href: "/dashboard/teacher/schedule", label: "الجلسات", icon: "🗓️", tint: "t-sky" },
    { href: "/dashboard/messages", label: "رسائل الحلقة", icon: "💬", tint: "t-lilac" },
    { href: "/dashboard/staff-messages", label: "رسائل الإدارة", icon: "📣", tint: "t-sand" },
    { href: "/dashboard/league", label: "الدوري", icon: "🏆", tint: "t-rose" },
    { href: "/dashboard/tasks", label: "مهامي", icon: "✅", tint: "t-peach" },
    { href: "/dashboard/teacher/halaqat/new", label: "حلقة جديدة", icon: "➕", tint: "t-mint" },
    { href: "/dashboard/search", label: "بحث", icon: "🔎", tint: "t-sky" },
  ],
  parent: [
    { href: "/dashboard/children", label: "الأبناء", icon: "👨‍👧", tint: "t-mint" },
    { href: "/dashboard/stats", label: "الإحصائيات", icon: "📈", tint: "t-sky" },
    { href: "/dashboard/messages", label: "إعلانات الحلقة", icon: "📣", tint: "t-lilac" },
    { href: "/dashboard/league", label: "الدوري", icon: "🏆", tint: "t-rose" },
    { href: "/dashboard/tasks", label: "مهامي", icon: "✅", tint: "t-sand" },
    { href: "/dashboard/guide", label: "الدليل", icon: "📘", tint: "t-peach" },
    { href: "/dashboard/settings", label: "الإعدادات", icon: "⚙️", tint: "t-mint" },
    { href: "/dashboard/support", label: "المساعدة", icon: "🤝", tint: "t-sky" },
  ],
};

/** App-style shortcut grid for the active role. */
export function QuickActions({ ctx }: { ctx: ContextKey | null }) {
  const items = ctx ? ACTIONS[ctx] : undefined;
  if (!items) return null;
  return (
    <nav aria-label="اختصارات" className="surface p-2 sm:p-3">
      <ul className="quick-grid">
        {items.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="quick-item">
              <span className={`tile-icon ${a.tint}`} aria-hidden>{a.icon}</span>
              {a.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
