import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Alert } from "@/components/ui";
import { StorageBanner } from "@/components/StorageBanner";
import { authSecretStatus } from "@/lib/auth";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <StorageBanner />
      <main id="main" className="public-hero flex flex-1 flex-col items-center px-4 py-8 sm:py-14">
        <Link href="/" className="mb-6" aria-label="TechMood Growth — الرئيسية">
          <Logo size={44} sub="من TechMood Technology" />
        </Link>
        <div className="w-full max-w-md">
          {authSecretStatus() === "missing" && (
            <div className="mb-4">
              <Alert tone="warning">لم يُضبط AUTH_SECRET على الخادم بعد، لذلك تسجيل الدخول متوقف. راجع docs/DEPLOYMENT.md.</Alert>
            </div>
          )}
          <div className="surface p-5 shadow-[var(--shadow-2)] sm:p-7">{children}</div>
        </div>
      </main>
    </>
  );
}
