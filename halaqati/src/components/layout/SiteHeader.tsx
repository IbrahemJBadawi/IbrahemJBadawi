import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/Icon";
import { DropdownCloser, ThemeToggle } from "@/components/layout/AppChrome";
import { AuthLinks } from "@/components/layout/AuthLinks";

const LINKS = [
  { href: "/halaqat", label: "الحلقات" },
  { href: "/teachers", label: "المحفّظون" },
  { href: "/centers", label: "الدور والمراكز" },
  { href: "/about", label: "عن حلقتي" },
];

export function SiteHeader() {
  return (
    <header className="topbar">
      <DropdownCloser />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" aria-label="حلقتي — الرئيسية">
          <Logo withTagline />
        </Link>
        <nav aria-label="الرئيسية" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3.5 py-2 font-semibold text-muted hover:bg-brand-100 hover:text-brand-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <AuthLinks />
          <details className="dropdown md:hidden">
            <summary className="icon-button" aria-label="القائمة"><Icon name="more" /></summary>
            <nav aria-label="القائمة" className="dropdown-panel !w-56">
              {[...LINKS, { href: "/register", label: "حساب جديد" }].map((l) => (
                <Link key={l.href} href={l.href} className="dropdown-item font-semibold">{l.label}</Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
