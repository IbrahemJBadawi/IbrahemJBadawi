import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { Icon } from "@/components/Icon";
import { DropdownCloser, InstallButton, MobileTabBar, SidebarNav, ThemeToggle, TopbarTitle, type NavGroup } from "@/components/layout/AppChrome";
import { NotConfigured } from "@/components/NotConfigured";
import { cx } from "@/components/ui";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { COMMON_NAV, CONTEXT_LABELS, NAV } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { switchContextAction } from "./actions";

function RoleSwitcher({ user, variant }: { user: CurrentUser; variant: "menu" | "sheet" }) {
  return (
    <div className={variant === "sheet" ? "flex flex-wrap gap-2" : undefined} role="group" aria-label="تبديل الدور">
      {user.contexts.map((c) => (
        <form key={c} action={switchContextAction}>
          <input type="hidden" name="context" value={c} />
          <button
            type="submit"
            className={variant === "sheet" ? cx("btn", c === user.activeContext ? "btn-primary" : "btn-secondary", "!min-h-9 !px-3 text-sm") : cx("dropdown-item", c === user.activeContext && "is-on")}
            aria-pressed={c === user.activeContext}
          >
            {variant === "menu" && <Icon name={c === user.activeContext ? "check" : "swap"} />}
            {CONTEXT_LABELS[c]}
          </button>
        </form>
      ))}
    </div>
  );
}

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  if (!isSupabaseConfigured) {
    return <main id="main" className="mx-auto max-w-xl p-6"><NotConfigured /></main>;
  }
  const user = await requireUser();
  const supabase = await createClient();
  const [{ count: unread }, { data: latest }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("notifications").select("id, title, link_path, read_at, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const contextNav = user.activeContext ? NAV[user.activeContext] : NAV.sponsor;
  const roleLabel = user.activeContext ? CONTEXT_LABELS[user.activeContext] : "حسابي";
  const groups: NavGroup[] = [
    { label: roleLabel, items: contextNav },
    { label: "الحساب", items: COMMON_NAV },
  ];
  const counts: Record<string, number> = unread ? { "/dashboard/notifications": unread, more: unread } : {};
  const tabs = contextNav.slice(0, 4);
  const initial = (user.displayName || user.fullName || "؟").trim().charAt(0);

  return (
    <div className="app">
      <DropdownCloser />
      <aside className="sidebar" aria-label="القائمة الجانبية">
        <Link href="/dashboard" className="sidebar-logo" aria-label="حلقتي — لوحة التحكم">
          <LogoMark size={38} />
          <span className="wordmark">حلقتي<small>رحلتك مع القرآن</small></span>
        </Link>
        <div className="sidebar-role">
          <span>أنت الآن</span>
          <strong>{roleLabel}</strong>
        </div>
        <SidebarNav groups={groups} counts={counts} />
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/dashboard" className="topbar-brand" aria-label="حلقتي — لوحة التحكم">
              <LogoMark size={32} />
              <span>حلقتي</span>
            </Link>
            <TopbarTitle groups={groups} />
            <div className="topbar-actions">
              {user.contexts.length > 1 && (
                <details className="dropdown topbar-wide">
                  <summary className="role-trigger" aria-label={`الدور الحالي: ${roleLabel}. تبديل الدور`}>
                    <Icon name="swap" size={16} />
                    <span className="label">{roleLabel}</span>
                  </summary>
                  <div className="dropdown-panel">
                    <div className="dropdown-head text-muted">بدّل بين أدوارك</div>
                    <RoleSwitcher user={user} variant="menu" />
                  </div>
                </details>
              )}

              <details className="dropdown">
                <summary className="icon-button" aria-label={`الإشعارات${unread ? `: ${unread} غير مقروءة` : ""}`}>
                  <Icon name="bell" />
                  {unread ? <span className="dot-badge">{unread > 99 ? "99+" : unread}</span> : null}
                </summary>
                <div className="dropdown-panel">
                  <div className="dropdown-head flex items-center justify-between">
                    <strong>الإشعارات</strong>
                    <Link href="/dashboard/notifications" className="text-sm font-semibold text-brand-800">عرض الكل</Link>
                  </div>
                  {(latest ?? []).length === 0 ? (
                    <p className="px-2.5 py-4 text-center text-sm text-muted">لا توجد إشعارات بعد</p>
                  ) : (
                    (latest ?? []).map((n) => (
                      <Link key={n.id} href={n.link_path || "/dashboard/notifications"} className={cx("dropdown-item !items-start", !n.read_at && "is-on")}>
                        <span className={cx("mt-2 size-2 shrink-0 rounded-full", n.read_at ? "bg-line-strong" : "bg-brand-fill")} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block leading-snug">{n.title}</span>
                          <span className="block text-xs text-muted">{formatDateTime(n.created_at)}</span>
                        </span>
                      </Link>
                    ))
                  )}
                  <Link href="/dashboard/settings#push" className="dropdown-item mt-1 border-t border-line text-sm text-brand-800">
                    <Icon name="bell" size={16} />تفعيل إشعارات الجهاز
                  </Link>
                </div>
              </details>

              <span className="topbar-wide"><ThemeToggle /></span>

              <details className="dropdown">
                <summary className="icon-button" aria-label="قائمة الحساب">
                  <span className="avatar size-9 text-sm">{initial}</span>
                </summary>
                <div className="dropdown-panel">
                  <div className="dropdown-head">
                    <strong className="block">{user.displayName || user.fullName}</strong>
                    {user.email && <span className="block truncate text-xs text-muted" dir="ltr">{user.email}</span>}
                  </div>
                  <Link href="/dashboard/profile" className="dropdown-item"><Icon name="user" />حسابي</Link>
                  <Link href="/dashboard/settings" className="dropdown-item"><Icon name="settings" />الإعدادات</Link>
                  <Link href="/dashboard/support" className="dropdown-item"><Icon name="support" />المساعدة والبلاغات</Link>
                  <InstallButton />
                  <form action="/auth/signout" method="post" className="mt-1 border-t border-line pt-1">
                    <button type="submit" className="dropdown-item is-danger"><Icon name="logout" />تسجيل الخروج</button>
                  </form>
                </div>
              </details>
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="content">{children}</main>
      </div>

      <MobileTabBar
        tabs={tabs}
        groups={groups}
        counts={counts}
        extra={
          <div className="flex flex-col gap-3">
            <div className="sheet-role">
              <span className="text-muted">أنت الآن:</span>
              <strong>{roleLabel}</strong>
            </div>
            {user.contexts.length > 1 && <RoleSwitcher user={user} variant="sheet" />}
            <div className="flex flex-wrap gap-2">
              <ThemeToggle withLabel />
              <InstallButton className="btn btn-secondary" />
              <form action="/auth/signout" method="post">
                <button type="submit" className="btn btn-ghost !text-danger"><Icon name="logout" />خروج</button>
              </form>
            </div>
          </div>
        }
      />
    </div>
  );
}
