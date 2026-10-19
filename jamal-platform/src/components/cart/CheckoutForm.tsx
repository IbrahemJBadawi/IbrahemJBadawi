"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Info, Lock } from "lucide-react";
import { placeOrderAction, type CheckoutState } from "@/lib/actions/checkout";
import type { ShippingOption } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/money";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { EmptyState, Notice, Skeleton } from "@/components/ui/States";
import { cart, useCart, useHydrated } from "./cart-store";
import { useQuote } from "./useQuote";

type Prefill = { name: string; phone: string };

export function CheckoutForm({ zones, prefill, loggedIn }: { zones: ShippingOption[]; prefill: Prefill; loggedIn: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useCart();
  const [state, setState] = useState<CheckoutState>({ ok: false });
  const [pending, startTransition] = useTransition();
  // One key per checkout: double clicks and retries can never create two orders.
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : ""));

  const { quote: baseQuote } = useQuote(lines, null);
  const currency = baseQuote?.currency ?? null;
  const zonesForCurrency = useMemo(() => zones.filter((z) => z.currency_code === currency), [zones, currency]);
  const countries = useMemo(() => {
    const m = new Map<string, string>();
    zonesForCurrency.forEach((z) => m.set(z.country_code, z.country_name));
    return [...m.entries()];
  }, [zonesForCurrency]);

  const [country, setCountry] = useState<string>("");
  const effectiveCountry = country || (countries.length === 1 ? countries[0][0] : "");
  const governorates = zonesForCurrency.filter((z) => z.country_code === effectiveCountry && z.governorate_id);
  const [governorateId, setGovernorateId] = useState<string>("");
  const needsGovernorate = governorates.length > 0;
  const areaReady = !!effectiveCountry && (!needsGovernorate || !!governorateId);
  const { quote, loading } = useQuote(lines, areaReady ? effectiveCountry : null, areaReady && governorateId ? governorateId : null);

  useEffect(() => {
    if (state.ok && state.orderNumber && state.accessToken) {
      cart.clear();
      router.replace(`/order/${state.orderNumber}?t=${state.accessToken}&new=1`);
    }
  }, [state, router]);

  if (!hydrated) return <Skeleton className="h-96 w-full" />;
  if (!lines.length && !state.ok) {
    return <EmptyState title="لا توجد منتجات في السلة" action={<ButtonLink href="/products">تسوّق الآن</ButtonLink>} />;
  }

  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const methods = quote?.paymentMethods ?? { bank_transfer: false, cod: false };
  const canSubmit = areaReady && !!quote?.ok && (methods.bank_transfer || methods.cod) && !loading && !!idempotencyKey;

  return (
    <form
      className="grid gap-10 lg:grid-cols-[1fr_24rem]"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            setState(await placeOrderAction(state, data));
          } catch {
            // Network failure: nothing is lost; resubmitting is safe (idempotency key).
            setState({ ok: false, error: "انقطع الاتصال قبل تأكيد الطلب. تحقق من الإنترنت ثم اضغط «إرسال الطلب» مرة أخرى — لن يتكرر الطلب.", values: Object.fromEntries([...data.entries()].map(([k, x]) => [k, String(x)])) });
          }
        });
      }}
    >
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="country" value={effectiveCountry} />
      <div className="space-y-8">
        <Notice>
          <span className="flex gap-2">
            <Info className="mt-1 size-4 shrink-0" />
            <span>
              لا تدفع الآن. بعد إرسال الطلب نتأكد من توفر المنتج لدى المورد ونعتمد السعر النهائي مع رسوم التوصيل، ثم تظهر لك تعليمات التحويل البنكي في صفحة الطلب.
            </span>
          </span>
        </Notice>
        {!loggedIn && (
          <p className="text-sm text-muted">
            لديك حساب؟ <Link href="/login?next=/checkout" className="font-semibold text-ink underline">سجّل الدخول</Link> لمتابعة طلباتك بسهولة، أو أكمل كضيف.
          </p>
        )}
        {state.error && <Notice tone="error">{state.error}</Notice>}

        <fieldset className="space-y-4">
          <legend className="mb-2 text-lg font-bold">بياناتك</legend>
          <Field label="الاسم الكامل" htmlFor="customerName" error={fe.customerName}>
            <Input id="customerName" name="customerName" autoComplete="name" required defaultValue={v.customerName ?? prefill.name} />
          </Field>
          <Field label="رقم الهاتف (واتساب إن أمكن)" htmlFor="phone" error={fe.phone} hint="مثال: ‎0599 123 456 أو ‎+970 599 123 456">
            <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className="text-end" required defaultValue={v.phone ?? prefill.phone} />
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-lg font-bold">عنوان التوصيل</legend>
          {currency && countries.length === 0 ? (
            <Notice tone="warning">التوصيل غير مفعّل حاليًا لمنتجات هذه السلة. تواصل معنا للاستفسار.</Notice>
          ) : (
            <>
              {countries.length > 1 && (
                <Field label="الدولة" htmlFor="countrySelect" error={fe.country}>
                  <Select id="countrySelect" value={effectiveCountry} onChange={(e) => { setCountry(e.target.value); setGovernorateId(""); }}>
                    <option value="">اختر الدولة</option>
                    {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </Select>
                </Field>
              )}
              {needsGovernorate && (
                <Field label="المحافظة" htmlFor="governorateId" error={fe.governorateId} hint="تظهر فقط المناطق التي نوصل إليها حاليًا">
                  <Select id="governorateId" name="governorateId" required value={governorateId} onChange={(e) => setGovernorateId(e.target.value)}>
                    <option value="">اختر المحافظة</option>
                    {governorates.map((z) => <option key={z.id} value={z.governorate_id!}>{z.governorate_name}</option>)}
                  </Select>
                </Field>
              )}
            </>
          )}
          <Field label="المدينة / البلدة" htmlFor="city" error={fe.city}>
            <Input id="city" name="city" autoComplete="address-level2" required defaultValue={v.city} />
          </Field>
          <Field label="العنوان التفصيلي" htmlFor="address" error={fe.address}>
            <Textarea id="address" name="address" autoComplete="street-address" required rows={3} placeholder="الحي، الشارع، أقرب معلم" defaultValue={v.address} />
          </Field>
          <Field label="ملاحظات للتوصيل (اختياري)" htmlFor="notes" error={fe.notes}>
            <Textarea id="notes" name="notes" rows={2} defaultValue={v.notes} />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-lg font-bold">طريقة الدفع</legend>
          {!areaReady ? (
            <p className="text-sm text-muted">اختر منطقة التوصيل لعرض الطرق المتاحة.</p>
          ) : loading ? (
            <Skeleton className="h-16 w-full" />
          ) : !methods.bank_transfer && !methods.cod ? (
            <Notice tone="warning">لا نستقبل طلبات جديدة حاليًا لهذه المنطقة.</Notice>
          ) : (
            (["bank_transfer", "cod"] as const).filter((m) => methods[m]).map((m, i) => (
              <label key={m} className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border border-line bg-paper p-4 has-[:checked]:border-ink">
                <input type="radio" name="paymentMethod" value={m} defaultChecked={v.paymentMethod ? v.paymentMethod === m : i === 0} className="mt-1 accent-ink" />
                <span className="text-sm">
                  <strong className="block">{m === "bank_transfer" ? "تحويل بنكي بعد اعتماد الطلب" : "الدفع عند الاستلام"}</strong>
                  <span className="text-muted">
                    {m === "bank_transfer"
                      ? "تحوّل المبلغ النهائي بعد أن نؤكد التوفر والسعر، وترفع إثبات التحويل من صفحة الطلب."
                      : "تدفع نقدًا عند الاستلام."}
                  </span>
                </span>
              </label>
            ))
          )}
          {fe.paymentMethod && <p className="text-xs text-danger">{fe.paymentMethod[0]}</p>}
          <p className="flex items-center gap-2 text-xs text-muted">
            <Lock className="size-3.5" /> لا نطلب بيانات بطاقتك ولا كلمات مرور بنكية أبدًا.
          </p>
        </fieldset>

        <Checkbox
          name="acceptTerms"
          required
          label={
            <>
              أوافق على <Link href="/policies/terms" target="_blank" className="underline">الشروط</Link> و
              <Link href="/policies/shipping" target="_blank" className="underline">سياسة التوصيل</Link> و
              <Link href="/policies/returns" target="_blank" className="underline">سياسة الإرجاع</Link> و
              <Link href="/policies/privacy" target="_blank" className="underline">الخصوصية</Link>.
            </>
          }
        />
        {fe.acceptTerms && <p className="-mt-6 text-xs text-danger">{fe.acceptTerms[0]}</p>}
      </div>

      <aside className="h-fit space-y-4 rounded-[var(--radius-card)] border border-line bg-paper p-6 lg:sticky lg:top-36">
        <h2 className="text-base font-bold">ملخص الطلب</h2>
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
          <div className="flex justify-between"><dt className="text-muted">المنتجات</dt><dd>{(quote ?? baseQuote)?.currency ? formatMoney((quote ?? baseQuote)!.subtotal, (quote ?? baseQuote)!.currency!) : "—"}</dd></div>
          <div className="flex justify-between">
            <dt className="text-muted">رسوم التوصيل (تقديرية)</dt>
            <dd>{quote?.shipping != null && quote.currency ? (Number(quote.shipping) === 0 ? "مجاني" : formatMoney(quote.shipping, quote.currency)) : "اختر المنطقة"}</dd>
          </div>
          {quote?.estimate && (
            <div className="flex justify-between"><dt className="text-muted">مدة التوصيل المتوقعة</dt><dd>{quote.estimate.min}–{quote.estimate.max} يوم عمل</dd></div>
          )}
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <dt>الإجمالي التقديري</dt>
            <dd>{quote?.currency && quote.ok ? formatMoney(quote.total, quote.currency) : "—"}</dd>
          </div>
        </dl>
        <p className="text-xs leading-6 text-muted">السعر النهائي (مع أي رسوم معلنة) يُعتمد بعد تأكيد التوفر ويظهر لك قبل أن تحوّل أي مبلغ.</p>
        {quote?.error && areaReady && <Notice tone="warning">{quote.error}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || pending} aria-busy={pending}>
          {pending ? "جارٍ إرسال الطلب…" : "إرسال الطلب"}
        </Button>
      </aside>
    </form>
  );
}
