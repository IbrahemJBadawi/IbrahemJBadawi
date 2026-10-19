import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main" className="public-hero flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo size={48} />
      <p className="mt-8 text-6xl font-extrabold grad-text num">404</p>
      <h1 className="mt-2 text-2xl font-extrabold">الصفحة غير موجودة</h1>
      <p className="mt-2 max-w-md text-muted">ربما تغيّر الرابط أو لم يعد هذا المحتوى متاحًا.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/">الصفحة الرئيسية</ButtonLink>
        <ButtonLink href="/dashboard" variant="secondary">لوحة التحكم</ButtonLink>
      </div>
    </main>
  );
}
