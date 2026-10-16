"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/roles";
import { cx } from "@/components/ui";

const ICONS: Record<string, string> = {
  "/dashboard": "⌂",
  "/dashboard/journey": "◔",
  "/dashboard/schedule": "▦",
  "/dashboard/teacher/schedule": "▦",
  "/dashboard/certificates": "★",
  "/dashboard/admin/verifications": "✓",
  "/dashboard/admin/tickets": "!",
  "/dashboard/plan": "✓",
  "/dashboard/sessions": "◷",
  "/dashboard/halaqat": "◎",
  "/dashboard/children": "☺",
  "/dashboard/teacher/halaqat": "◎",
  "/dashboard/teacher/halaqat/new": "+",
  "/dashboard/admin/users": "☺",
  "/dashboard/admin/institutions": "▤",
  "/dashboard/admin/privacy": "◈",
  "/dashboard/profile": "●",
};

/** App-style tab bar for phones (≤ 5 items, large touch targets). */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  return (
    <nav aria-label="التنقل السريع" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto flex max-w-lg justify-around">
        {items.slice(0, 5).map((i) => (
          <li key={i.href} className="flex-1">
            <Link
              href={i.href}
              aria-current={active(i.href) ? "page" : undefined}
              className={cx("flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold", active(i.href) ? "text-brand-800" : "text-muted")}
            >
              <span aria-hidden className={cx("flex size-7 items-center justify-center rounded-full text-base", active(i.href) && "bg-brand-100")}>{ICONS[i.href] ?? "•"}</span>
              <span className="line-clamp-1 text-center">{i.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
