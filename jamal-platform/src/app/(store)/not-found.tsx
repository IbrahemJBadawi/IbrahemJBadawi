import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-display text-6xl text-beige-deep">404</p>
      <h1 className="mt-4 text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-2 text-sm text-muted">ربما تم نقل الصفحة أو حذفها.</p>
      <ButtonLink href="/" className="mt-8">العودة للرئيسية</ButtonLink>
    </div>
  );
}
