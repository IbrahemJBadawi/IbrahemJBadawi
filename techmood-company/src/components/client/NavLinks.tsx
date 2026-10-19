"use client";

import Link from "next/link";
import { NAV, BOTTOM_NAV, isActive } from "@/config/nav";
import { href } from "@/i18n/config";
import { useLocale } from "@/i18n/client";
import { Icon } from "@/components/Icon";
import { usePath } from "./usePath";

export function MainNav() {
  const locale = useLocale();
  const path = usePath();
  return (
    <nav className="main-nav" aria-label={locale === "ar" ? "القائمة الرئيسية" : "Main menu"}>
      {NAV.filter((item) => item.path !== "/").map((item) => (
        <Link key={item.path} href={href(locale, item.path)} aria-current={isActive(path, item.path) ? "page" : undefined}>
          {item.label[locale]}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const locale = useLocale();
  const path = usePath();
  const items = BOTTOM_NAV.map((p) => NAV.find((item) => item.path === p)!);
  return (
    <nav className="bottom-nav" aria-label={locale === "ar" ? "التنقل السريع" : "Quick navigation"}>
      {items.map((item) => (
        <Link
          key={item.path}
          href={href(locale, item.path)}
          className={item.path === "/ventures" ? "is-center" : undefined}
          aria-current={isActive(path, item.path) ? "page" : undefined}
        >
          <span className="nav-icon">
            <Icon name={item.icon} size={item.path === "/ventures" ? 22 : 20} />
          </span>
          {item.label[locale]}
        </Link>
      ))}
    </nav>
  );
}
