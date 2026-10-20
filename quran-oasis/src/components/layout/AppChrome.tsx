"use client";

import { LogIn, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/components/ui/cn";
import { useStore } from "@/lib/store/store";
import { ADMIN_NAV, DESKTOP_EXTRA, isActive, PRIMARY_NAV, SECONDARY_NAV } from "./nav";
import { OfflineBanner } from "./OnlineStatus";

function AccountButton() {
  const { enabled, user, loading } = useAuth();
  if (!enabled || loading) return null;
  if (!user)
    return (
      <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg focus-ring">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        تسجيل الدخول
      </Link>
    );
  return (
    <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent focus-ring" aria-label="الملف الشخصي">
      <UserRound className="h-5 w-5" />
    </Link>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const focus = useStore((s) => s.settings.focusMode);
  const isReader = /^\/quran\/\d+/.test(pathname);
  const staff = profile?.role === "admin" || profile?.role === "editor";
  if (focus && isReader) return null;
  const desktopNav = [...PRIMARY_NAV, ...DESKTOP_EXTRA];
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <OfflineBanner />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/today" className="shrink-0 rounded-xl focus-ring" aria-label="واحة القرآن — اليوم">
          <Logo />
        </Link>
        <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 lg:flex">
          {desktopNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-2 text-[14px] font-semibold transition-colors focus-ring",
                isActive(pathname, item.href) ? "bg-accent-soft text-fg" : "text-muted hover:text-fg",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 lg:flex">
            {[...SECONDARY_NAV.filter((i) => ["/stats", "/saved", "/profile", "/tasbih", "/qibla"].includes(i.href)), ...(staff ? [ADMIN_NAV] : [])].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full focus-ring",
                  isActive(pathname, item.href) ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
          </div>
          <AccountButton />
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const focus = useStore((s) => s.settings.focusMode);
  const isReader = /^\/quran\/\d+/.test(pathname);
  const staff = profile?.role === "admin" || profile?.role === "editor";

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (focus && isReader) return null;
  const moreActive = SECONDARY_NAV.some((i) => isActive(pathname, i.href));
  const more = [...SECONDARY_NAV, ...(staff ? [ADMIN_NAV] : [])];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-deep/30 backdrop-blur-[1px] lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <div
        id="more-menu"
        className={cn(
          "fixed inset-x-3 bottom-[5.5rem] z-50 rounded-3xl border border-line bg-surface p-3 shadow-xl transition-all lg:hidden",
          open ? "visible translate-y-0 opacity-100" : "invisible translate-y-4 opacity-0",
        )}
      >
        <nav aria-label="أقسام إضافية" className="grid grid-cols-3 gap-2">
          {more.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={open ? 0 : -1}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center text-[13px] font-semibold focus-ring",
                isActive(pathname, item.href) ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-2",
              )}
            >
              <item.icon className="h-5 w-5 text-accent" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <nav
        aria-label="التنقل السفلي"
        className="safe-bottom fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-[1.75rem] border border-line/70 bg-surface/90 shadow-[0_12px_32px_-12px_rgba(35,67,52,.35)] backdrop-blur-md lg:hidden"
      >
        <ul className="grid h-16 grid-cols-5 px-1">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold focus-ring",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full", active && "bg-accent-soft")}>
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="more-menu"
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold focus-ring",
                open || moreActive ? "text-primary" : "text-muted",
              )}
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-full", (open || moreActive) && "bg-accent-soft")}>
                {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </span>
              المزيد
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
