import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { EngagePrompt } from "@/components/pwa/Engage";
import { getSession } from "@/lib/auth";
import { hasDemoProducts } from "@/lib/data/catalog";
import { isDemoRuntime } from "@/lib/db/core";

async function DemoBanner() {
  if (!(await hasDemoProducts())) return null;
  return (
    <div className="border-b border-warning/20 bg-warning/5 px-4 py-2 text-center text-xs leading-6 text-warning">
      {isDemoRuntime()
        ? "نسخة عرض تجريبية: المنتجات للعرض فقط، لا تحوّل أي مبلغ، والبيانات تُمسح تلقائيًا."
        : "منتجات تجريبية للاختبار فقط — ليست للبيع، والطلبات عليها طلبات اختبار."}
    </div>
  );
}

async function Engage() {
  const session = await getSession();
  return <EngagePrompt signedIn={!!session} />;
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
      <Suspense fallback={null}>
        <Engage />
      </Suspense>
    </>
  );
}
