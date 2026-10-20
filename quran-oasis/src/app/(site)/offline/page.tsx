import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "غير متصل", robots: { index: false } };

export default function OfflinePage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold-soft text-gold-fg">
        <WifiOff className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-bold">أنت غير متصل بالإنترنت</h1>
      <p className="mt-2 leading-relaxed text-muted">
        هذه الصفحة لم تُحفظ على جهازك بعد. يمكنك فتح الأقسام التي زرتها سابقًا، أو تنزيل المصحف من الإعدادات عند عودة الاتصال لتقرأ دون إنترنت.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <ButtonLink href="/today">لوحة اليوم</ButtonLink>
        <ButtonLink href="/quran" variant="outline">
          المصحف
        </ButtonLink>
      </div>
    </section>
  );
}
