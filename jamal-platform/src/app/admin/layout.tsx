import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { Monogram } from "@/components/ui/Logo";
import { Suspense } from "react";
import { NotificationBell } from "@/components/notifications/Bell";

export const metadata: Metadata = {
  title: { default: "لوحة الإدارة", template: "%s | إدارة JAMAL" },
  robots: { index: false, follow: false },
};

// Every admin page is private and per-request; it is allowed to block on the session.
export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return (
    <div className="-mb-[calc(4.25rem+env(safe-area-inset-bottom))] min-h-screen bg-ivory md:mb-0 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-paper print:hidden lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/admin" className="flex items-center gap-2 font-display text-xl tracking-[0.3em]" dir="ltr"><Monogram className="w-6" />JAMAL</Link>
          <span className="flex items-center gap-2">
            <Suspense fallback={null}><NotificationBell href="/admin/notifications" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-sand" /></Suspense>
            <span className="rounded-full bg-sand px-2 py-0.5 text-[0.65rem] font-semibold text-beige-deep">إدارة</span>
          </span>
        </div>
        <AdminNav />
        <div className="hidden space-y-2 border-t border-line px-5 py-4 text-xs text-muted lg:block">
          <p className="truncate" title={admin.email ?? ""}>{admin.email}</p>
          <div className="flex gap-3">
            <Link href="/" className="hover:text-ink">عرض المتجر</Link>
            <form action={logoutAction}><button type="submit" className="hover:text-danger">خروج</button></form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
