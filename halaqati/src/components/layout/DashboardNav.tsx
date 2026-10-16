"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/roles";
import { cx } from "@/components/ui";

export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cx(
              "block rounded-lg px-3 py-2.5 font-semibold",
              isActive(item.href) ? "bg-brand-800 text-white" : "text-ink hover:bg-brand-50",
            )}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
