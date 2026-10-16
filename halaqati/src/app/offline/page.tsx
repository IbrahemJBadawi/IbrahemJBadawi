import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "لا يوجد اتصال" };

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <LogoMark size={72} />
      <h1 className="text-2xl font-bold text-brand-900">لا يوجد اتصال بالإنترنت</h1>
      <p className="text-muted">تحقّق من الاتصال ثم أعد المحاولة. الصفحات العامة التي فتحتها سابقًا تعمل دون اتصال، أما بياناتك الخاصة فلا تُحفظ على الجهاز حمايةً لخصوصيتك.</p>
      {/* Full page load on purpose: client-side navigation cannot work offline. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="rounded-lg bg-brand-800 px-4 py-2 font-semibold text-white">إعادة المحاولة</a>
    </main>
  );
}
