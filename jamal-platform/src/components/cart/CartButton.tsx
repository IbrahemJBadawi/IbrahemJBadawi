"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-store";

export function CartButton({ className = "" }: { className?: string }) {
  const lines = useCart();
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <Link href="/cart" className={`relative ${className}`} aria-label={count ? `السلة (${count})` : "السلة"}>
      <ShoppingBag className="size-5" strokeWidth={1.6} />
      {count > 0 && (
        <span className="absolute -top-0.5 end-0 flex min-w-4.5 items-center justify-center rounded-full bg-ink px-1 text-[0.65rem] font-bold leading-4.5 text-ivory">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
