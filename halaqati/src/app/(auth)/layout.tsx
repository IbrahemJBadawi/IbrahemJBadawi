import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Alert } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main id="main" className="flex flex-1 flex-col items-center px-4 py-8">
      <Link href="/" className="mb-6" aria-label="حلقتي — الرئيسية">
        <Logo withTagline />
      </Link>
      <div className="w-full max-w-md">
        {!isSupabaseConfigured && (
          <div className="mb-4">
            <Alert tone="warning">لم يتم إعداد الاتصال بقاعدة البيانات بعد. راجع ملف ‎.env.example‎.</Alert>
          </div>
        )}
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6">{children}</div>
      </div>
    </main>
  );
}
