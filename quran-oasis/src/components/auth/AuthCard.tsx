import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-4">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8">
        <div className="mb-6 text-center">
          <LogoMark className="mx-auto h-12 w-12" />
          <h1 className="mt-4 text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {isSupabaseConfigured ? (
          children
        ) : (
          <div role="status" className="rounded-2xl bg-gold-soft p-4 text-sm leading-relaxed text-gold-fg">
            خدمة الحسابات غير مفعّلة في هذه النسخة بعد. يمكنك استخدام المنصة كاملة كزائر، ويُحفظ تقدمك على هذا الجهاز.
            <Link href="/today" className="mt-2 block font-bold underline">
              متابعة كزائر
            </Link>
          </div>
        )}
      </div>
      {footer && <div className="mt-4 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}

export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed")) return "لم يتم تأكيد البريد الإلكتروني بعد. تحقق من بريدك.";
  if (m.includes("already registered") || m.includes("already been registered")) return "هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول.";
  if (m.includes("password should be") || m.includes("weak")) return "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل مع أرقام وحروف.";
  if (m.includes("rate limit") || m.includes("too many")) return "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.";
  if (m.includes("failed to fetch") || m.includes("network")) return "تعذّر الاتصال بالخادم. تحقق من الإنترنت.";
  if (m.includes("same password")) return "كلمة المرور الجديدة يجب أن تختلف عن الحالية.";
  return "حدث خطأ غير متوقع. حاول مرة أخرى.";
}
