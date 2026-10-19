"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>⚠️</p>
      <h1 className="mt-4 text-2xl font-extrabold">حدث خطأ غير متوقع</h1>
      <p className="mt-2 max-w-md text-muted">لم تُفقد بياناتك. أعد المحاولة، وإن تكرر الخطأ فأخبر فريق الدعم.</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>إعادة المحاولة</Button>
        <a href="/" className="btn btn-secondary">الرئيسية</a>
      </div>
    </main>
  );
}
