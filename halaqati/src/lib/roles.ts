import type { IconName } from "@/components/Icon";

/**
 * Role & context model (pure, unit-tested).
 *
 * Global roles live in `user_roles`. Center/organization admin contexts are
 * derived from memberships. The active context only changes what the UI
 * shows — every permission is enforced again by RLS in the database.
 */
export const APP_ROLES = ["student", "parent", "quran_teacher", "instructor", "sponsor", "platform_admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export type ContextKey = AppRole | "center_admin" | "org_admin";

/** Roles a person can pick for themselves at signup / in their profile. */
export const SELF_SERVICE_ROLES: AppRole[] = ["student", "parent", "quran_teacher"];

/** Contexts whose dashboards are implemented in this release. */
export const IMPLEMENTED_CONTEXTS: ContextKey[] = ["student", "parent", "quran_teacher", "platform_admin"];

export const CONTEXT_LABELS: Record<ContextKey, string> = {
  student: "طالب",
  parent: "ولي أمر",
  quran_teacher: "محفّظ",
  instructor: "معلّم دورات",
  sponsor: "كفيل",
  platform_admin: "إدارة المنصة",
  center_admin: "أمير مركز",
  org_admin: "مدير دار",
};

export const ROLE_DESCRIPTIONS: Partial<Record<AppRole, string>> = {
  student: "أتعلّم وأحفظ في حلقة أو بشكل فردي",
  parent: "أتابع تقدّم أبنائي",
  quran_teacher: "أدير حلقات تحفيظ ومراجعة",
};

const ORDER: ContextKey[] = ["quran_teacher", "student", "parent", "center_admin", "org_admin", "instructor", "sponsor", "platform_admin"];

export type MembershipSummary = { id: string; name: string; role: string; status: string };

export type UserContextData = {
  roles: AppRole[];
  centers: MembershipSummary[];
  organizations: MembershipSummary[];
};

export function availableContexts(data: UserContextData): ContextKey[] {
  const set = new Set<ContextKey>();
  for (const r of data.roles) if ((APP_ROLES as readonly string[]).includes(r)) set.add(r);
  if (data.centers.some((c) => c.role === "admin")) set.add("center_admin");
  if (data.organizations.some((o) => o.role === "owner" || o.role === "admin")) set.add("org_admin");
  return ORDER.filter((k) => set.has(k));
}

/** Picks the requested context only if the user actually has it. */
export function resolveActiveContext(requested: string | undefined | null, available: ContextKey[]): ContextKey | null {
  if (requested && (available as string[]).includes(requested)) return requested as ContextKey;
  return available[0] ?? null;
}

export function isContextKey(value: unknown): value is ContextKey {
  return typeof value === "string" && value in CONTEXT_LABELS;
}

export type NavItem = { href: string; label: string; icon: IconName };

export const NAV: Record<ContextKey, NavItem[]> = {
  student: [
    { href: "/dashboard", label: "الرئيسية", icon: "home" },
    { href: "/dashboard/journey", label: "رحلتي", icon: "journey" },
    { href: "/dashboard/tasks", label: "مهامي", icon: "tasks" },
    { href: "/dashboard/league", label: "الدوري", icon: "trophy" },
    { href: "/dashboard/messages", label: "الرسائل", icon: "chat" },
    { href: "/dashboard/achievements", label: "إنجازاتي", icon: "medal" },
    { href: "/dashboard/stats", label: "إحصائياتي", icon: "stats" },
    { href: "/dashboard/plan", label: "خطتي", icon: "plan" },
    { href: "/dashboard/schedule", label: "جدولي", icon: "calendar" },
    { href: "/dashboard/sessions", label: "جلساتي", icon: "sessions" },
    { href: "/dashboard/halaqat", label: "حلقاتي", icon: "halaqa" },
    { href: "/dashboard/certificates", label: "شهاداتي", icon: "certificate" },
  ],
  parent: [
    { href: "/dashboard", label: "الرئيسية", icon: "home" },
    { href: "/dashboard/children", label: "الأبناء", icon: "child" },
    { href: "/dashboard/messages", label: "الرسائل", icon: "chat" },
    { href: "/dashboard/stats", label: "الإحصائيات", icon: "stats" },
    { href: "/dashboard/league", label: "الدوري", icon: "trophy" },
    { href: "/dashboard/tasks", label: "مهامي", icon: "tasks" },
  ],
  quran_teacher: [
    { href: "/dashboard", label: "الرئيسية", icon: "home" },
    { href: "/dashboard/teacher/halaqat", label: "حلقاتي", icon: "halaqa" },
    { href: "/dashboard/teacher/schedule", label: "جدولي", icon: "calendar" },
    { href: "/dashboard/messages", label: "الرسائل", icon: "chat" },
    { href: "/dashboard/league", label: "الدوري", icon: "trophy" },
    { href: "/dashboard/teacher/halaqat/new", label: "حلقة جديدة", icon: "plus" },
    { href: "/dashboard/tasks", label: "مهامي", icon: "tasks" },
  ],
  platform_admin: [
    { href: "/dashboard", label: "الرئيسية", icon: "home" },
    { href: "/dashboard/admin/users", label: "المستخدمون", icon: "users" },
    { href: "/dashboard/admin/verifications", label: "التوثيق", icon: "shield" },
    { href: "/dashboard/admin/tickets", label: "البلاغات", icon: "flag" },
    { href: "/dashboard/admin/institutions", label: "المؤسسات", icon: "building" },
    { href: "/dashboard/admin/privacy", label: "طلبات الخصوصية", icon: "lock" },
    { href: "/dashboard/admin/audit", label: "سجل التدقيق", icon: "list" },
    { href: "/dashboard/admin/demo", label: "البيانات التجريبية", icon: "sparkles" },
  ],
  center_admin: [{ href: "/dashboard", label: "الرئيسية", icon: "home" }],
  org_admin: [{ href: "/dashboard", label: "الرئيسية", icon: "home" }],
  instructor: [{ href: "/dashboard", label: "الرئيسية", icon: "home" }],
  sponsor: [{ href: "/dashboard", label: "الرئيسية", icon: "home" }],
};

export const COMMON_NAV: NavItem[] = [
  { href: "/dashboard/notifications", label: "الإشعارات", icon: "bell" },
  { href: "/dashboard/search", label: "البحث", icon: "search" },
  { href: "/dashboard/guide", label: "دليل النقاط والمستويات", icon: "book" },
  { href: "/dashboard/settings", label: "الإعدادات", icon: "settings" },
  { href: "/dashboard/support", label: "المساعدة والبلاغات", icon: "support" },
  { href: "/dashboard/profile", label: "حسابي", icon: "user" },
];

/** Where the active item is: exact for the home link, prefix for sections (most specific wins). */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const i of items) {
    const hit = i.href === "/dashboard" ? pathname === "/dashboard" : pathname === i.href || pathname.startsWith(i.href + "/");
    if (hit && (!best || i.href.length > best.length)) best = i.href;
  }
  return best;
}
