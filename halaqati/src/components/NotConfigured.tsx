import { Alert } from "@/components/ui";
import Link from "next/link";

export function NotConfigured() {
  return (
    <Alert tone="warning">
      لوحات المستخدمين المتصلة تحتاج إعداد Supabase، لكن يمكنك الآن استخدام نماذج حلقاتي وحفظ سجلاتها مشفرة على جهازك. <Link href="/forms" className="font-bold underline">افتح النماذج المحلية</Link>
    </Alert>
  );
}
