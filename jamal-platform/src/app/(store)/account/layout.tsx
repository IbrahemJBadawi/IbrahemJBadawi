import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";

async function AdminLink() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return null;
  return <li><Link href="/admin" className="block py-2 font-semibold text-beige-deep">لوحة الإدارة</Link></li>;
}

// Auth-gated: rendering waits for the session (redirects to login otherwise).
export const instant = false;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page grid gap-8 py-8 md:grid-cols-[13rem_1fr] md:py-12">
      <nav aria-label="الحساب" className="text-sm">
        <ul className="flex gap-5 overflow-x-auto border-b border-line md:block md:border-b-0 md:border-e md:pe-6">
          <li><Link href="/account" className="block py-2">بياناتي</Link></li>
          <li><Link href="/account/orders" className="block py-2">طلباتي</Link></li>
          <li><Link href="/account/notifications" className="block py-2">الإشعارات</Link></li>
          <li><Link href="/support" className="block py-2">الدعم</Link></li>
          <li><Link href="/favorites" className="block py-2">المفضلة</Link></li>
          <Suspense fallback={null}><AdminLink /></Suspense>
          <li>
            <form action={logoutAction}>
              <button type="submit" className="block py-2 text-muted hover:text-danger">تسجيل الخروج</button>
            </form>
          </li>
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
