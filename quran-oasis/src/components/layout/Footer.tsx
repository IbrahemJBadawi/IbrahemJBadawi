import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/site";

const LINKS = [
  { href: "/privacy", label: "سياسة الخصوصية" },
  { href: "/terms", label: "شروط الاستخدام" },
  { href: "/sources", label: "مصادر المحتوى" },
  { href: "/contact", label: "تواصل معنا" },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted">{SITE.tagline}</p>
        </div>
        <nav aria-label="روابط التذييل" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-fg focus-ring rounded">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">
        بلا إعلانات داخل المصحف أو الأذكار · © {new Date().getFullYear()} {SITE.name}
      </p>
    </footer>
  );
}
