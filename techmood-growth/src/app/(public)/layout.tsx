import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StorageBanner } from "@/components/StorageBanner";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const NAV = [
  ["/features", "المزايا"],
  ["/pricing", "الأسعار"],
  ["/install", "التطبيق"],
] as const;

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const signedIn = (await cookies()).has("tg_session");
  return (
    <>
      <StorageBanner />
      <header className="topbar">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" aria-label="TechMood Growth — الرئيسية">
            <Logo size={34} />
          </Link>
          <nav className="ms-4 hidden items-center gap-1 md:flex" aria-label="القائمة الرئيسية">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="btn btn-ghost btn-sm">
                {label}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle />
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-primary btn-sm">لوحتي</Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">دخول</Link>
                <Link href="/register" className="btn btn-primary btn-sm">ابدأ مجانًا</Link>
              </>
            )}
          </div>
        </div>
        <nav className="chips px-4 pb-2 md:hidden" aria-label="القائمة">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="chip">{label}</Link>
          ))}
          {!signedIn && <Link href="/login" className="chip">دخول</Link>}
        </nav>
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo size={28} />
            <p className="mt-2">منتج من TechMood Technology — صُمّم للخليج وفلسطين.</p>
          </div>
          <nav className="flex flex-wrap gap-4" aria-label="روابط">
            <Link href="/features">المزايا</Link>
            <Link href="/pricing">الأسعار</Link>
            <Link href="/privacy">الخصوصية</Link>
            <Link href="/terms">الشروط</Link>
          </nav>
        </div>
      </footer>
      <InstallPrompt />
    </>
  );
}
