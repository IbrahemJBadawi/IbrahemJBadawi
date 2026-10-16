"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-900">حدث خطأ</h1>
      <p className="text-muted">تعذّر إكمال الطلب. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.</p>
      <Button onClick={reset}>إعادة المحاولة</Button>
    </main>
  );
}
