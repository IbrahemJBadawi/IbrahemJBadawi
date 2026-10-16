import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} حلقتي — رحلتك مع القرآن</p>
        <nav aria-label="روابط السياسات" className="flex gap-4">
          <Link href="/privacy" className="hover:text-brand-800">الخصوصية</Link>
          <Link href="/terms" className="hover:text-brand-800">شروط الاستخدام</Link>
          <Link href="/about" className="hover:text-brand-800">عن حلقتي</Link>
          <Link href="/verify" className="hover:text-brand-800">التحقق من شهادة</Link>
          <Link href="/app" className="hover:text-brand-800">ثبّت التطبيق</Link>
        </nav>
      </div>
    </footer>
  );
}
