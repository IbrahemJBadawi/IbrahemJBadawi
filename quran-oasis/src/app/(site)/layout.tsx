import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/layout/Footer";
import { OfflineBanner } from "@/components/layout/OnlineStatus";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/85 backdrop-blur">
        <OfflineBanner />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="rounded-xl focus-ring" aria-label="واحة القرآن — الرئيسية">
            <Logo />
          </Link>
          <nav aria-label="التنقل" className="flex items-center gap-1 text-[15px] font-semibold">
            <Link href="/quran" className="hidden rounded-full px-3 py-2 text-muted hover:text-fg sm:inline-block focus-ring">
              القرآن الكريم
            </Link>
            <Link href="/adhkar" className="hidden rounded-full px-3 py-2 text-muted hover:text-fg sm:inline-block focus-ring">
              الأذكار
            </Link>
            <Link href="/today" className="rounded-full bg-primary px-4 py-2 text-primary-fg focus-ring">
              ابدأ رحلتك
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
