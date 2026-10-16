"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/components/cart/cart-store";

/** App-style bottom navigation for phones (hidden from md and up). */
export function BottomNav() {
  const pathname = usePathname();
  const count = useCart().reduce((s, l) => s + l.quantity, 0);
  const items = [
    { href: "/", label: "الرئيسية", icon: Home, match: (p: string) => p === "/" },
    { href: "/products", label: "تسوّق", icon: LayoutGrid, match: (p: string) => /^\/(products|category|offers|search|product)/.test(p) },
    { href: "/cart", label: "السلة", icon: ShoppingBag, match: (p: string) => p.startsWith("/cart") || p.startsWith("/checkout"), badge: count },
    { href: "/favorites", label: "المفضلة", icon: Heart, match: (p: string) => p.startsWith("/favorites") },
    { href: "/account", label: "حسابي", icon: User, match: (p: string) => /^\/(account|login|register)/.test(p) },
  ];
  return (
    <nav aria-label="التنقل السريع" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon, match, badge }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[0.68rem] ${active ? "font-bold text-ink" : "text-muted"}`}>
                <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-ink text-ivory" : ""}`}>
                  <Icon className="size-[1.15rem]" strokeWidth={active ? 2 : 1.6} />
                </span>
                {label}
                {!!badge && (
                  <span className="absolute top-1.5 start-[calc(50%+0.5rem)] min-w-4 rounded-full bg-danger px-1 text-center text-[0.6rem] font-bold leading-4 text-white">{badge > 99 ? "99+" : badge}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
