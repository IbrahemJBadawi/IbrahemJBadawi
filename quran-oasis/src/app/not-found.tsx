import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-24 text-center">
      <LogoMark className="mx-auto h-14 w-14" />
      <h1 className="mt-6 text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-2 text-muted">ربما تغيّر الرابط أو لم تعد الصفحة متاحة.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/today" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg">
          لوحة اليوم
        </Link>
        <Link href="/quran" className="rounded-full border border-line px-5 py-2.5 font-semibold">
          المصحف
        </Link>
      </div>
    </main>
  );
}
