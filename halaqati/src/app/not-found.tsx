import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-900">الصفحة غير موجودة</h1>
      <p className="text-muted">ربما نُقلت الصفحة أو لا تملك صلاحية الوصول إليها.</p>
      <ButtonLink href="/">العودة إلى الرئيسية</ButtonLink>
    </main>
  );
}
