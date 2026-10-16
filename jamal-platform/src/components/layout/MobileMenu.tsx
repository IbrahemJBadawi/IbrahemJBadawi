"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileMenu({ categories }: { categories: { slug: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the drawer after navigation.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const link = "block border-b border-line/70 py-4 text-base text-ink";
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sand"
        aria-label="فتح القائمة"
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <Menu className="size-5" strokeWidth={1.6} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="القائمة" id="mobile-menu">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 start-0 flex w-[85%] max-w-sm flex-col overflow-y-auto bg-ivory px-6 pb-8 shadow-xl">
            <div className="flex h-16 items-center justify-between">
              <span className="font-display text-xl tracking-[0.35em]" dir="ltr">JAMAL</span>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sand" aria-label="إغلاق القائمة">
                <X className="size-5" />
              </button>
            </div>
            <p className="eyebrow mt-4">تسوّقي حسب الفئة</p>
            <ul>
              <li><Link href="/products" className={link}>جميع المنتجات</Link></li>
              {categories.map((c) => (
                <li key={c.slug}><Link href={`/category/${c.slug}`} className={link}>{c.name}</Link></li>
              ))}
              <li><Link href="/offers" className={`${link} font-semibold text-danger`}>العروض والتخفيضات</Link></li>
            </ul>
            <ul className="mt-6 space-y-1 text-sm text-ink-soft">
              <li><Link href="/favorites" className="block py-2">المفضلة</Link></li>
              <li><Link href="/account/orders" className="block py-2">طلباتي</Link></li>
              <li><Link href="/track" className="block py-2">تتبع الطلب</Link></li>
              <li><Link href="/contact" className="block py-2">اتصل بنا</Link></li>
              <li><Link href="/faq" className="block py-2">الأسئلة الشائعة</Link></li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
