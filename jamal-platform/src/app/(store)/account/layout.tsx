import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";

async function AdminLink() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return null;
  return <li><Link href="/admin" className="block font-semibold text-beige-deep">لوحة الإدارة</Link></li>;
}

// Auth-gated: rendering waits for the session (redirects to login otherwise).
export const instant = false;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page grid gap-8 py-8 md:grid-cols-[13rem_1fr] md:py-12">
      <nav aria-label="الحساب" className="text-sm">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:block md:space-y-1 md:border-e md:border-line md:px-0 md:pe-6 [&_a]:whitespace-nowrap [&_a]:rounded-full [&_a]:border [&_a]:border-line [&_a]:bg-paper [&_a]:px-4 [&_a]:py-2 md:[&_a]:border-0 md:[&_a]:bg-transparent md:[&_a]:px-0">
          <li><Link href="/account" className="block">بياناتي</Link></li>
          <li><Link href="/account/orders" className="block">طلباتي</Link></li>
          <li><Link href="/account/notifications" className="block">الإشعارات</Link></li>
          <li><Link href="/support" className="block">الدعم</Link></li>
          <li><Link href="/favorites" className="block">المفضلة</Link></li>
          <Suspense fallback={null}><AdminLink /></Suspense>
          <li>
            <form action={logoutAction}>
              <button type="submit" className="block whitespace-nowrap px-3 py-2 text-muted hover:text-danger md:px-0">تسجيل الخروج</button>
            </form>
          </li>
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
