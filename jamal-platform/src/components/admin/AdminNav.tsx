"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList, FileText, HandCoins, LifeBuoy, ReceiptText, Bell, Globe2, History, LayoutDashboard, Mail, Package, Percent, Settings, Shapes, Truck, Undo2, Users,
} from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "الملخص", icon: LayoutDashboard },
  { href: "/admin/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/admin/settlements", label: "مستحقات الموردين", icon: HandCoins },
  { href: "/admin/returns", label: "المرتجعات", icon: Undo2 },
  { href: "/admin/tickets", label: "تذاكر الدعم", icon: LifeBuoy },
  { href: "/admin/invoices", label: "الفواتير", icon: ReceiptText },
  { href: "/admin/notifications", label: "الإشعارات", icon: Bell },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/categories", label: "الفئات", icon: Shapes },
  { href: "/admin/offers", label: "العروض والأسعار", icon: Percent },
  { href: "/admin/suppliers", label: "الموردون", icon: Truck },
  { href: "/admin/customers", label: "العملاء", icon: Users },
  { href: "/admin/shipping", label: "الدول والشحن", icon: Globe2 },
  { href: "/admin/pages", label: "الصفحات والسياسات", icon: FileText },
  { href: "/admin/messages", label: "الرسائل", icon: Mail },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
  { href: "/admin/audit", label: "سجل العمليات", icon: History },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="لوحة الإدارة" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              active ? "bg-ink text-ivory" : "text-ink-soft hover:bg-sand"
            }`}
          >
            <Icon className="size-4" strokeWidth={1.7} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
