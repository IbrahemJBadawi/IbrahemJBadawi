"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { placeOrderAction, type CheckoutState } from "@/lib/actions/checkout";
import type { ShippingOption } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/money";
import { t } from "@/lib/i18n/ar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { EmptyState, Notice, Skeleton } from "@/components/ui/States";
import { cart, useCart, useHydrated } from "./cart-store";
import { useQuote } from "./useQuote";

type Prefill = { name: string; phone: string; email: string };

export function CheckoutForm({ zones, prefill, loggedIn }: { zones: ShippingOption[]; prefill: Prefill; loggedIn: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useCart();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, { ok: false });
  const [country, setCountry] = useState<string>(state.values?.country ?? "");
  const { quote, loading } = useQuote(lines, country || null);
  const { quote: baseQuote } = useQuote(lines, null);

  useEffect(() => {
    if (state.ok) {
      cart.clear();
      router.replace("/checkout/confirmation");
    }
  }, [state.ok, router]);

  if (!hydrated) return <Skeleton className="h-96 w-full" />;
  if (!lines.length && !state.ok) {
    return <EmptyState title="لا توجد منتجات في السلة" action={<ButtonLink href="/products">تسوّق الآن</ButtonLink>} />;
  }

  const currency = baseQuote?.currency ?? null;
  const countries = zones.filter((z) => z.currency_code === currency);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const methods = quote?.paymentMethods ?? { cod: false, manual: false };
  const canSubmit = !!country && !!quote?.ok && (methods.cod || methods.manual) && !loading;

  return (
    <form
      className="grid gap-10 lg:grid-cols-[1fr_24rem]"
      noValidate
      onSubmit={(e) => {
        // Submit manually: React's automatic form reset would clear the controlled
        // country select when the server returns validation errors.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <div className="space-y-8">
        {!loggedIn && (
          <Notice>
            لديك حساب؟ <Link href="/login?next=/checkout" className="font-semibold underline">سجّل الدخول</Link> لمتابعة طلباتك بسهولة. يمكنك أيضًا الطلب كضيف.
          </Notice>
        )}
        {state.error && <Notice tone="error">{state.error}</Notice>}

        <fieldset className="space-y-4">
          <legend className="mb-2 text-lg font-bold">بيانات التواصل</legend>
          <Field label="الاسم الكامل" htmlFor="customerName" error={fe.customerName}>
            <Input id="customerName" name="customerName" autoComplete="name" required defaultValue={v.customerName ?? prefill.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="رقم الهاتف" htmlFor="phone" error={fe.phone} hint="مع رمز الدولة، مثل ‎+962 7…">
              <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className="text-end" required defaultValue={v.phone ?? prefill.phone} />
            </Field>
            <Field label="البريد الإلكتروني (اختياري)" htmlFor="email" error={fe.email}>
              <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" className="text-end" defaultValue={v.email ?? prefill.email} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-lg font-bold">عنوان التوصيل</legend>
          {currency && countries.length === 0 ? (
            <Notice tone="warning">الشحن غير متاح حاليًا لمنتجات هذه السلة. تواصل معنا للاستفسار.</Notice>
          ) : (
            <Field label="الدولة" htmlFor="country" error={fe.country}>
              <Select id="country" name="country" required value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country">
                <option value="">اختر الدولة</option>
                {countries.map((z) => (
                  <option key={z.id} value={z.country_code}>{z.country_name}</option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="المدينة" htmlFor="city" error={fe.city}>
              <Input id="city" name="city" autoComplete="address-level2" required defaultValue={v.city} />
            </Field>
            <Field label="العنوان التفصيلي" htmlFor="address" error={fe.address} className="sm:col-span-2">
              <Textarea id="address" name="address" autoComplete="street-address" required rows={3} placeholder="الحي، الشارع، رقم البناء، أقرب معلم" defaultValue={v.address} />
            </Field>
          </div>
          <Field label="ملاحظات (اختياري)" htmlFor="notes" error={fe.notes}>
            <Textarea id="notes" name="notes" rows={2} defaultValue={v.notes} />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-lg font-bold">طريقة الطلب والدفع</legend>
          {!country ? (
            <p className="text-sm text-muted">اختر الدولة لعرض الطرق المتاحة.</p>
          ) : loading ? (
            <Skeleton className="h-16 w-full" />
          ) : !methods.cod && !methods.manual ? (
            <Notice tone="warning">لا توجد طريقة طلب متاحة حاليًا لهذه الدولة.</Notice>
          ) : (
            <>
              {(["cod", "manual"] as const).filter((m) => methods[m]).map((m, i) => (
                <label key={m} className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4 has-[:checked]:border-ink">
                  <input type="radio" name="paymentMethod" value={m} defaultChecked={v.paymentMethod ? v.paymentMethod === m : i === 0} className="mt-1 accent-ink" />
                  <span className="text-sm">
                    <strong className="block">{m === "cod" ? t.paymentMethod.cod : "طلب يدوي"}</strong>
                    <span className="text-muted">
                      {m === "cod" ? "تدفع نقدًا للمندوب عند استلام الطلب." : "نتواصل معك هاتفيًا لتأكيد الطلب والاتفاق على طريقة الدفع قبل التنفيذ."}
                    </span>
                  </span>
                </label>
              ))}
            </>
          )}
          {fe.paymentMethod && <p className="text-xs text-danger">{fe.paymentMethod[0]}</p>}
          <p className="flex items-center gap-2 text-xs text-muted">
            <Lock className="size-3.5" /> لا يتم الدفع الإلكتروني عبر الموقع حاليًا ولا نطلب بيانات بطاقتك.
          </p>
        </fieldset>

        <Checkbox
          name="acceptTerms"
          required
          label={
            <>
              أوافق على <Link href="/policies/terms" target="_blank" className="underline">الشروط والأحكام</Link> و
              <Link href="/policies/shipping" target="_blank" className="underline">سياسة الشحن</Link> و
              <Link href="/policies/returns" target="_blank" className="underline">سياسة الإرجاع</Link> و
              <Link href="/policies/privacy" target="_blank" className="underline">سياسة الخصوصية</Link>.
            </>
          }
        />
        {fe.acceptTerms && <p className="-mt-6 text-xs text-danger">{fe.acceptTerms[0]}</p>}
      </div>

      <aside className="h-fit space-y-4 rounded-[var(--radius-card)] border border-line bg-paper p-6 lg:sticky lg:top-36">
        <h2 className="text-base font-bold">طلبك</h2>
        <ul className="space-y-3">
          {(quote ?? baseQuote)?.lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="line-clamp-1">{l.name}</span>
                <span className="text-xs text-muted">{[l.variantLabel, `× ${l.quantity}`].filter(Boolean).join(" · ")}</span>
                {l.problem && <span className="block text-xs text-danger">{l.problem}</span>}
              </span>
              <span className="shrink-0">{l.currency && formatMoney(l.lineTotal, l.currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">المجموع الفرعي</dt><dd>{quote?.currency ? formatMoney(quote.subtotal, quote.currency) : "—"}</dd></div>
          <div className="flex justify-between">
            <dt className="text-muted">الشحن</dt>
            <dd>{quote?.shipping != null && quote.currency ? (Number(quote.shipping) === 0 ? "مجاني" : formatMoney(quote.shipping, quote.currency)) : "اختر الدولة"}</dd>
          </div>
          {quote?.estimate && (
            <div className="flex justify-between"><dt className="text-muted">التوصيل المتوقع</dt><dd>{quote.estimate.min}–{quote.estimate.max} يوم عمل</dd></div>
          )}
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <dt>الإجمالي</dt>
            <dd>{quote?.currency ? formatMoney(quote.total, quote.currency) : "—"}</dd>
          </div>
        </dl>
        {quote?.error && country && <Notice tone="warning">{quote.error}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || pending}>
          {pending ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}
        </Button>
        <p className="text-center text-xs leading-6 text-muted">سيتم مراجعة طلبك والتواصل معك لتأكيده قبل التنفيذ.</p>
      </aside>
    </form>
  );
}
