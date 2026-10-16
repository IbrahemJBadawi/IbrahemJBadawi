import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const LINKS = [
  { href: "/halaqat", label: "الحلقات" },
  { href: "/teachers", label: "المحفّظون" },
  { href: "/centers", label: "الدور والمراكز" },
  { href: "/about", label: "عن حلقتي" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label="حلقتي — الرئيسية">
          <Logo withTagline />
        </Link>
        <nav aria-label="الرئيسية" className="hidden items-center gap-5 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="font-semibold text-ink hover:text-brand-800">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 font-semibold text-brand-800 hover:bg-brand-50">دخول</Link>
          <Link href="/register" className="hidden rounded-lg bg-brand-800 px-3 py-2 font-semibold text-white hover:bg-brand-900 sm:inline-block">حساب جديد</Link>
          <details className="relative md:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-line px-3 font-semibold" aria-label="القائمة">
              القائمة
            </summary>
            <nav aria-label="القائمة" className="absolute left-0 z-20 mt-2 w-52 rounded-xl border border-line bg-white p-2 shadow-lg">
              {[...LINKS, { href: "/register", label: "حساب جديد" }].map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2.5 font-semibold hover:bg-brand-50">
                  {l.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
