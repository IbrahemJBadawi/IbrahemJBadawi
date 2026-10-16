import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { BottomNav } from "@/components/layout/BottomNav";
import { DashboardNav } from "@/components/layout/DashboardNav";
import { NotConfigured } from "@/components/NotConfigured";
import { Button, Select } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { COMMON_NAV, CONTEXT_LABELS, NAV } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { switchContextAction } from "./actions";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  if (!isSupabaseConfigured) {
    return <main id="main" className="mx-auto max-w-xl p-6"><NotConfigured /></main>;
  }
  const user = await requireUser();
  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  const contextNav = user.activeContext ? NAV[user.activeContext] : [{ href: "/dashboard", label: "الرئيسية" }];
  const quickNav = [...contextNav.slice(0, 4), { href: "/dashboard/profile", label: "حسابي" }];
  const items = [...contextNav, ...COMMON_NAV].map((i) =>
    i.href === "/dashboard/notifications" && unread ? { ...i, label: `${i.label} (${unread})` } : i,
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="لوحة التحكم">
            <LogoMark size={36} />
            <span className="hidden font-bold text-brand-800 sm:inline">حلقتي</span>
          </Link>
          {user.contexts.length > 1 && (
            <form action={switchContextAction} className="flex items-center gap-1.5">
              <label htmlFor="context" className="sr-only">الدور الحالي</label>
              <Select name="context" defaultValue={user.activeContext ?? undefined} className="!min-h-10 !w-auto !py-1">
                {user.contexts.map((c) => <option key={c} value={c}>{CONTEXT_LABELS[c]}</option>)}
              </Select>
              <Button type="submit" variant="secondary" className="!min-h-10 !px-3">تبديل</Button>
            </form>
          )}
          <div className="flex items-center gap-1">
            <Link href="/dashboard/notifications" className="relative rounded-lg px-2 py-2 font-semibold text-brand-800 hover:bg-brand-50" aria-label={`الإشعارات${unread ? `: ${unread} غير مقروءة` : ""}`}>
              🔔{unread ? <span className="absolute -top-0.5 -left-0.5 rounded-full bg-danger px-1.5 text-xs text-white">{unread}</span> : null}
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="rounded-lg px-2 py-2 text-sm font-semibold text-muted hover:bg-brand-50">خروج</button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pt-4 pb-24 md:flex-row md:gap-6 md:py-6">
        <nav aria-label="قائمة لوحة التحكم" className="md:w-56 md:shrink-0">
          <details className="rounded-xl border border-line bg-white p-2 md:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center px-2 font-semibold">
              القائمة — {user.activeContext ? CONTEXT_LABELS[user.activeContext] : "حسابي"}
            </summary>
            <div className="mt-2"><DashboardNav items={items} /></div>
          </details>
          <div className="hidden rounded-xl border border-line bg-white p-2 md:block">
            <p className="px-3 py-2 text-sm text-muted">{user.fullName}</p>
            <DashboardNav items={items} />
          </div>
        </nav>
        <main id="main" className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav items={quickNav} />
    </div>
  );
}
