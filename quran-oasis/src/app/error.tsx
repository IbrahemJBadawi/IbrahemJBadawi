"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errors";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="mt-2 text-muted">نعتذر عن ذلك. تقدّمك محفوظ على جهازك ولن يضيع.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg">
        إعادة المحاولة
      </button>
    </main>
  );
}
