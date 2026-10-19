import { Alert } from "@/components/ui";

export function NotConfigured() {
  return (
    <Alert tone="warning">
      لم يتم ربط المنصة بقاعدة البيانات بعد. يحتاج المسؤول التقني إلى ضبط متغيرات Supabase (راجع docs/SETUP.md).
    </Alert>
  );
}
