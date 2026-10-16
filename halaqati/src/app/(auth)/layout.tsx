import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Alert } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main id="main" className="auth-bg flex flex-1 flex-col items-center px-4 py-8 sm:py-14">
      <Link href="/" className="mb-6" aria-label="حلقتي — الرئيسية">
        <Logo withTagline />
      </Link>
      <div className="w-full max-w-md">
        {!isSupabaseConfigured && (
          <div className="mb-4">
            <Alert tone="warning">لم يتم إعداد الاتصال بقاعدة البيانات بعد. راجع ملف ‎.env.example‎.</Alert>
          </div>
        )}
        <div className="surface p-5 shadow-[var(--shadow-2)] sm:p-7">{children}</div>
      </div>
    </main>
  );
}
