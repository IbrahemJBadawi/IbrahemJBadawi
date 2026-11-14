"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2, HardDriveDownload, Info } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { readBrowserDemoOrders, writeBrowserDemoOrder } from "@/lib/demo/browser-store";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, Notice, Skeleton } from "@/components/ui/States";
import { cart, useCart, useHydrated } from "./cart-store";
import { useQuote } from "./useQuote";

export function LocalDemoCheckout() {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useCart();
  const { quote, loading, error: quoteError } = useQuote(lines, null);
  const [label, setLabel] = useState("طلب تجريبي");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValid = !!quote?.ok && !!quote.currency && quote.lines.length > 0 &&
    quote.lines.every((line) => line.isDemo && !line.problem);
  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isValid || !quote) {
      setError("لم نتمكن من التحقق من المنتجات التجريبية. راجع السلة.");
      return;
    }
    const outcome = writeBrowserDemoOrder({
      label,
      note,
      currency: quote.currency!,
      subtotal: quote.subtotal,
      lines: quote.lines.map((line) => ({
        productId: line.productId,
        name: line.name,
        variant: line.variantLabel,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
    });
    if (!outcome.ok) {
      setError(outcome.message);
      return;
    }
    // Only clear the cart after storage confirms the order was saved.
    cart.clear();
    router.push("/demo-orders");
  }

  if (!hydrated) return <Skeleton className="h-72 w-full" />;
  if (!lines.length) {
    return <EmptyState title="السلة التجريبية فارغة" description="اختر منتجات من الكتالوج التجريبي، ثم ارجع لإتمام الطلب." action={<ButtonLink href="/products">عرض المنتجات</ButtonLink>} />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <form id="local-demo-checkout" onSubmit={onSave} className="space-y-6">
        <Notice tone="warning">
          <span className="flex items-start gap-2"><Info className="mt-1 size-4 shrink-0" />
            هذا وضع تجريبي فقط. الطلبات تُحفظ في هذا المتصفح ولا تُرسل إلى متجر أو قاعدة بيانات. لا تدخل أسماء حقيقية أو أرقام هواتف أو بيانات دفع.
          </span>
        </Notice>
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <label htmlFor="demo-label" className="mb-2 block text-sm font-bold">اسم التجربة (اختياري)</label>
          <input id="demo-label" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 text-sm outline-offset-2" placeholder="طلب تجريبي" />
          <label htmlFor="demo-note" className="mb-2 mt-5 block text-sm font-bold">ملاحظات تجريبية (اختياري)</label>
          <textarea id="demo-note" maxLength={300} rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-line bg-ivory px-4 py-3 text-sm outline-offset-2" placeholder="ملاحظات غير حقيقية للاختبار فقط" />
        </div>
        <div className="flex items-start gap-2 text-sm leading-7 text-muted">
          <HardDriveDownload className="mt-1 size-5 shrink-0" />
          يمكنك مراجعة الطلبات لاحقًا على هذا الجهاز. حذف بيانات الموقع أو فتحه من جهاز آخر لن يعرض هذه الطلبات.
        </div>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
      <aside className="h-fit space-y-4 rounded-[var(--radius-card)] border border-line bg-paper p-6">
        <h2 className="font-bold">ملخص السلة التجريبية</h2>
        {loading ? <Skeleton className="h-36 w-full" /> : quoteError || !quote ? (
          <Notice tone="error">تعذّر جلب أسعار المنتجات التجريبية.</Notice>
        ) : (
          <>
            {quote.lines.map((line) => (
              <div key={line.key} className="flex justify-between gap-4 border-b border-line pb-3 text-sm">
                <span>{line.name} {line.variantLabel ? `(${line.variantLabel})` : ""} × {line.quantity}</span>
                <span className="shrink-0">{line.currency ? formatMoney(line.lineTotal, line.currency) : "—"}</span>
                {line.problem && <span className="text-danger">{line.problem}</span>}
              </div>
            ))}
            <div className="flex justify-between text-base font-bold">
              <span>مجموع المنتجات (تجريبي)</span>
              <span>{quote.currency ? formatMoney(quote.subtotal, quote.currency) : "—"}</span>
            </div>
          </>
        )}
        <p className="text-xs leading-6 text-muted">لا توصيل ولا دفع ولا إرسال فعلي للطلب؛ الأسعار للعرض فقط.</p>
        <Button type="submit" form="local-demo-checkout" size="lg" className="w-full" disabled={!isValid || loading}>
          <CheckCircle2 className="size-4" /> حفظ الطلب في المتصفح
        </Button>
        <Link href="/demo-orders" className="block text-center text-sm font-semibold underline">عرض طلباتي التجريبية ({typeof window === "undefined" ? "—" : readBrowserDemoOrders().length})</Link>
      </aside>
    </div>
  );
}
