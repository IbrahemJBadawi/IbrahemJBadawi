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

export type NavItem = { href: string; label: string };

export const NAV: Record<ContextKey, NavItem[]> = {
  student: [
    { href: "/dashboard", label: "الرئيسية" },
    { href: "/dashboard/journey", label: "رحلتي" },
    { href: "/dashboard/plan", label: "خطتي" },
    { href: "/dashboard/schedule", label: "جدولي" },
    { href: "/dashboard/sessions", label: "جلساتي" },
    { href: "/dashboard/halaqat", label: "حلقاتي" },
    { href: "/dashboard/certificates", label: "شهاداتي" },
  ],
  parent: [
    { href: "/dashboard", label: "الرئيسية" },
    { href: "/dashboard/children", label: "الأبناء" },
  ],
  quran_teacher: [
    { href: "/dashboard", label: "الرئيسية" },
    { href: "/dashboard/teacher/halaqat", label: "حلقاتي" },
    { href: "/dashboard/teacher/schedule", label: "جدولي" },
    { href: "/dashboard/teacher/halaqat/new", label: "حلقة جديدة" },
  ],
  platform_admin: [
    { href: "/dashboard", label: "الرئيسية" },
    { href: "/dashboard/admin/users", label: "المستخدمون" },
    { href: "/dashboard/admin/verifications", label: "التوثيق" },
    { href: "/dashboard/admin/tickets", label: "البلاغات" },
    { href: "/dashboard/admin/institutions", label: "المؤسسات" },
    { href: "/dashboard/admin/privacy", label: "طلبات الخصوصية" },
    { href: "/dashboard/admin/audit", label: "سجل التدقيق" },
  ],
  center_admin: [{ href: "/dashboard", label: "الرئيسية" }],
  org_admin: [{ href: "/dashboard", label: "الرئيسية" }],
  instructor: [{ href: "/dashboard", label: "الرئيسية" }],
  sponsor: [{ href: "/dashboard", label: "الرئيسية" }],
};

export const COMMON_NAV: NavItem[] = [
  { href: "/dashboard/notifications", label: "الإشعارات" },
  { href: "/dashboard/support", label: "المساعدة والبلاغات" },
  { href: "/dashboard/profile", label: "حسابي" },
];
