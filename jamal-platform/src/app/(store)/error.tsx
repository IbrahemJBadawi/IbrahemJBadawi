"use client";

import { Button } from "@/components/ui/Button";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="mt-2 text-sm text-muted">نعتذر، تعذّر تحميل هذه الصفحة. حاول مرة أخرى.</p>
      <Button className="mt-8" onClick={reset}>إعادة المحاولة</Button>
    </div>
  );
}
