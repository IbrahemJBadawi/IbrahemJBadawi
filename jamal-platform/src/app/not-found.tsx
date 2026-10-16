import { ButtonLink } from "@/components/ui/Button";
import { Monogram } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <Monogram variant="outline" className="w-14 opacity-60" />
      <p className="mt-6 font-display text-5xl text-beige-deep">404</p>
      <h1 className="mt-3 text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-2 text-sm text-muted">ربما تم نقل الصفحة أو حذفها، أو ليست لديك صلاحية للوصول إليها.</p>
      <ButtonLink href="/" className="mt-8">العودة للرئيسية</ButtonLink>
    </main>
  );
}
