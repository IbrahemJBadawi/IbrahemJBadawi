import { Monogram } from "@/components/ui/Logo";

export const metadata = { title: "لا يوجد اتصال", robots: { index: false } };

export default function Offline() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <Monogram variant="outline" className="w-14 opacity-60" />
      <h1 className="mt-6 text-2xl font-bold">لا يوجد اتصال بالإنترنت</h1>
      <p className="mt-2 max-w-sm text-sm leading-7 text-muted">تحقق من اتصالك ثم أعد المحاولة. لم يُرسل أي طلب أو دفعة أثناء انقطاع الاتصال.</p>
      {/* A full page load is intended here: it retries the network from scratch. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="mt-8 rounded-[var(--radius-control)] bg-ink px-6 py-3 text-sm font-semibold text-ivory">إعادة المحاولة</a>
    </main>
  );
}
