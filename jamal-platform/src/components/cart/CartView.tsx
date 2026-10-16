"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { EmptyState, Notice, Skeleton } from "@/components/ui/States";
import { ProductImage } from "@/components/product/ProductImage";
import { cart, useCart, useHydrated } from "./cart-store";
import { useQuote } from "./useQuote";

export function CartView() {
  const hydrated = useHydrated();
  const lines = useCart();
  const { quote, loading, error } = useQuote(lines, null);

  if (!hydrated) return <Skeleton className="h-64 w-full" />;
  if (!lines.length) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-10" strokeWidth={1.3} />}
        title="سلتك فارغة"
        description="ابدأ بإضافة القطع التي تعجبك."
        action={<ButtonLink href="/products">تسوّق الآن</ButtonLink>}
      />
    );
  }

  const hasProblems = quote?.lines.some((l) => l.problem);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <ul className="divide-y divide-line border-y border-line" aria-busy={loading}>
        {lines.map((line, i) => {
          const q = quote?.lines[i];
          return (
            <li key={`${line.productId}:${line.variantId}`} className="flex gap-4 py-5">
              <Link href={q?.slug ? `/product/${q.slug}` : "#"} className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-sand md:w-28">
                <ProductImage src={q?.image} alt={q?.name ?? ""} sizes="112px" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                {q ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={q.slug ? `/product/${q.slug}` : "#"} className="line-clamp-2 text-sm font-semibold leading-6 hover:underline">{q.name}</Link>
                        {q.variantLabel && <p className="mt-1 text-xs text-muted">{q.variantLabel}</p>}
                        {q.isDemo && <p className="mt-1 text-xs font-semibold text-warning">منتج تجريبي</p>}
                      </div>
                      <p className="shrink-0 text-sm font-bold">{q.currency && formatMoney(q.lineTotal, q.currency)}</p>
                    </div>
                    {q.problem && <p className="mt-2 text-xs font-semibold text-danger" role="alert">{q.problem}</p>}
                  </>
                ) : (
                  <div className="space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
                )}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-[var(--radius-card)] border border-line bg-paper">
                    <button type="button" className="flex size-9 items-center justify-center disabled:opacity-40" disabled={line.quantity <= 1} onClick={() => cart.setQuantity(line.productId, line.variantId, line.quantity - 1)} aria-label="إنقاص الكمية">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold">{line.quantity}</span>
                    <button type="button" className="flex size-9 items-center justify-center disabled:opacity-40" disabled={line.quantity >= 20} onClick={() => cart.setQuantity(line.productId, line.variantId, line.quantity + 1)} aria-label="زيادة الكمية">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button type="button" onClick={() => cart.remove(line.productId, line.variantId)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-danger">
                    <Trash2 className="size-4" /> إزالة
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <aside className="h-fit space-y-4 rounded-[var(--radius-card)] border border-line bg-paper p-6 lg:sticky lg:top-36">
        <h2 className="text-base font-bold">ملخص الطلب</h2>
        {error && <Notice tone="error">تعذّر حساب السلة. حاول تحديث الصفحة.</Notice>}
        {quote?.error && <Notice tone="warning">{quote.error}</Notice>}
        <div className="flex justify-between text-sm">
          <span className="text-muted">المجموع الفرعي</span>
          {loading || !quote ? <Skeleton className="h-4 w-20" /> : <strong>{quote.currency ? formatMoney(quote.subtotal, quote.currency) : "—"}</strong>}
        </div>
        <p className="text-xs leading-6 text-muted">تُحسب تكلفة الشحن وطرق الطلب المتاحة حسب الدولة في الخطوة التالية.</p>
        <Link
          href="/checkout"
          aria-disabled={loading || hasProblems || !quote?.currency}
          className={buttonClass("primary", "lg", `w-full ${loading || hasProblems || !quote?.currency ? "pointer-events-none opacity-50" : ""}`)}
        >
          إتمام الطلب
        </Link>
        <Link href="/products" className="block text-center text-sm text-beige-deep underline-offset-4 hover:underline">متابعة التسوق</Link>
      </aside>
    </div>
  );
}
