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
    <nav aria-label="التنقل السريع" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 print:hidden md:hidden">
      <ul className="grid grid-cols-5 rounded-full bg-ink/95 p-1.5 shadow-[0_12px_32px_-12px_rgba(29,27,24,0.6)] backdrop-blur">
        {items.map(({ href, label, icon: Icon, match, badge }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[0.66rem] transition-colors ${active ? "bg-ivory font-bold text-ink" : "text-ivory/70 hover:text-ivory"}`}>
                <Icon className="size-[1.15rem]" strokeWidth={active ? 2.1 : 1.6} />
                {label}
                {!!badge && (
                  <span className="absolute top-1 start-[calc(50%+0.35rem)] min-w-4 rounded-full bg-danger ring-2 ring-ink px-1 text-center text-[0.6rem] font-bold leading-4 text-white">{badge > 99 ? "99+" : badge}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
