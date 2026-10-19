import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallBanner } from "@/components/pwa/InstallApp";
import { hasDemoProducts } from "@/lib/data/catalog";

async function DemoBanner() {
  if (!(await hasDemoProducts())) return null;
  return (
    <div className="border-b border-warning/20 bg-warning/5 px-4 py-2 text-center text-xs leading-6 text-warning">
      يعرض المتجر حاليًا منتجات تجريبية لأغراض الاختبار فقط — ليست معروضة للبيع، والطلبات عليها تُسجّل كطلبات اختبار.
    </div>
  );
}

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
        انتقل إلى المحتوى
      </a>
      <Suspense fallback={null}>
        <DemoBanner />
      </Suspense>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
      <InstallBanner />
    </>
  );
}
