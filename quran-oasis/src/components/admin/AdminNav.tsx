"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

const ITEMS = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/moments", label: "لحظة واحة" },
  { href: "/admin/adhkar", label: "الأذكار" },
  { href: "/admin/learning", label: "التعلّم" },
  { href: "/admin/sources", label: "المصادر" },
  { href: "/admin/users", label: "المستخدمون", admin: true },
  { href: "/admin/errors", label: "الأخطاء", admin: true },
];

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="أقسام الإدارة" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1.5 whitespace-nowrap">
        {ITEMS.filter((i) => !i.admin || role === "admin").map((i) => {
          const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn("inline-block rounded-full px-4 py-2 text-sm font-semibold focus-ring", active ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted hover:text-fg")}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
