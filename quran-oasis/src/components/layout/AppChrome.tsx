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
    <header className="qo-topbar sticky top-0 z-40 border-b border-line/70">
      <OfflineBanner />
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/today" className="qo-topbar-logo shrink-0 rounded-xl focus-ring" aria-label="واحة القرآن — اليوم">
          <Logo />
        </Link>
        <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-0.5 lg:flex">
          {desktopNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className={cn(
                "qo-nav-link inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-bold focus-ring",
                isActive(pathname, item.href) ? "bg-accent-soft text-primary" : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden xl:inline">{item.label}</span>
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
                  "qo-nav-link grid h-10 w-10 place-items-center rounded-xl focus-ring",
                  isActive(pathname, item.href) ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
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
          "fixed inset-x-3 bottom-[6.5rem] z-50 mx-auto max-w-lg rounded-[1.5rem] border border-line bg-surface/95 p-3 shadow-xl backdrop-blur-xl transition-all lg:hidden",
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
                "qo-quick-tile flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-center text-[12px] font-bold focus-ring",
                isActive(pathname, item.href) ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-2",
              )}
            >
              <item.icon className="h-5 w-5 text-accent" strokeWidth={1.8} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <nav
        aria-label="التنقل السفلي"
        className="qo-bottom-nav safe-bottom fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-[1.5rem] border border-line/70 lg:hidden"
      >
        <ul className="grid h-[4.25rem] grid-cols-5 px-1.5">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold focus-ring",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <span className={cn("grid h-8 w-12 place-items-center rounded-xl transition-colors", active && "bg-accent-soft")}>
                    <item.icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
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
                "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold focus-ring",
                open || moreActive ? "text-primary" : "text-muted",
              )}
            >
              <span className={cn("grid h-8 w-12 place-items-center rounded-xl", (open || moreActive) && "bg-accent-soft")}>
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
