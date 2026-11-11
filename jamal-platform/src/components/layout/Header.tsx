import Link from "next/link";
import { Suspense } from "react";
import { Heart, Search, User } from "lucide-react";
import { getCategories, getStoreSettings } from "@/lib/data/catalog";
import { Logo } from "@/components/ui/Logo";
import { CartButton } from "@/components/cart/CartButton";
import { MobileMenu } from "./MobileMenu";
import { assistantAvailable } from "@/lib/ai/availability";
import { NotificationBell } from "@/components/notifications/Bell";

async function Announcement() {
  const s = await getStoreSettings();
  if (!s?.announcement_ar) return null;
  return <div className="bg-ink px-4 py-2 text-center text-xs font-medium text-ivory">{s.announcement_ar}</div>;
}

async function CategoryNav() {
  const categories = await getCategories();
  return (
    <ul className="flex max-w-full items-center justify-center gap-2 overflow-x-auto px-3 py-1 text-sm [scrollbar-width:none]">
      {categories.map((c) => (
        <li key={c.id}>
          <Link href={`/category/${c.slug}`} className="inline-flex whitespace-nowrap rounded-full px-4 py-2 text-ink-soft transition-colors hover:bg-sand hover:text-ink">
            {c.name_ar}
          </Link>
        </li>
      ))}
      <li>
        <Link href="/offers" className="inline-flex whitespace-nowrap rounded-full px-4 py-2 font-semibold text-danger transition-colors hover:bg-danger/10">
          العروض
        </Link>
      </li>
    </ul>
  );
}

async function MobileMenuLoader() {
  const [categories, assistant] = await Promise.all([getCategories(), assistantAvailable()]);
  return <MobileMenu categories={categories.map((c) => ({ slug: c.slug, name: c.name_ar }))} assistant={assistant} />;
}

const iconLink = "inline-flex size-10 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-200 hover:bg-sand active:scale-95 focus-visible:outline-offset-2 md:size-11";

export function Header() {
  return (
    <>
      <Suspense fallback={null}>
        <Announcement />
      </Suspense>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/90 shadow-[0_4px_20px_-18px_rgba(29,27,24,0.5)] backdrop-blur-xl supports-[backdrop-filter]:bg-ivory/80 print:hidden">
        <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20">
          <div className="flex items-center gap-1">
            <Suspense fallback={<span className="size-10 md:hidden" />}>
              <MobileMenuLoader />
            </Suspense>
            <Link href="/search" className={`${iconLink} md:!w-auto md:min-w-44 md:justify-start md:gap-2 md:border md:border-line md:bg-paper/70 md:px-4`} aria-label="البحث عن المنتجات">
              <Search className="size-5 shrink-0" strokeWidth={1.8} />
              <span className="hidden text-xs font-medium text-muted md:inline">ابحث عن قطعة...</span>
            </Link>
          </div>
          <Logo />
          <div className="flex items-center justify-end gap-0.5">
            <Suspense fallback={null}>
              <NotificationBell className={iconLink} />
            </Suspense>
            <Link href="/favorites" className={`${iconLink} max-sm:hidden`} aria-label="المفضلة">
              <Heart className="size-5" strokeWidth={1.6} />
            </Link>
            <Link href="/account" className={`${iconLink} max-md:hidden`} aria-label="حسابي">
              <User className="size-5" strokeWidth={1.6} />
            </Link>
            <CartButton className={iconLink} />
          </div>
        </div>
        <nav aria-label="الفئات" className="hidden border-t border-line/70 md:block">
          <Suspense fallback={<div className="h-11" />}>
            <CategoryNav />
          </Suspense>
        </nav>
      </header>
    </>
  );
}
