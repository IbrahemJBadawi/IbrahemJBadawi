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
    <ul className="flex items-center justify-center gap-7 text-sm">
      {categories.map((c) => (
        <li key={c.id}>
          <Link href={`/category/${c.slug}`} className="py-3 text-ink-soft transition-colors hover:text-ink">
            {c.name_ar}
          </Link>
        </li>
      ))}
      <li>
        <Link href="/offers" className="py-3 font-semibold text-danger hover:text-danger/80">
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

const iconLink = "inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-sand";

export function Header() {
  return (
    <>
      <Suspense fallback={null}>
        <Announcement />
      </Suspense>
      <header className="sticky top-0 z-40 print:hidden border-b border-line bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/85">
        <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20">
          <div className="flex items-center gap-1">
            <Suspense fallback={<span className="size-10 md:hidden" />}>
              <MobileMenuLoader />
            </Suspense>
            <Link href="/search" className={iconLink} aria-label="البحث">
              <Search className="size-5" strokeWidth={1.6} />
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
