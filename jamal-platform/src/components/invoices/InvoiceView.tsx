import { formatMoney, toMills } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import type { Invoice } from "@/lib/data/invoices";
import { Monogram } from "@/components/ui/Logo";
import { PrintButton } from "./PrintButton";

const fmt = (s: string) => new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "long" }).format(new Date(s));

export function InvoiceView({ inv }: { inv: Invoice }) {
  const c = inv.currency_code;
  return (
    <article className="mx-auto max-w-2xl rounded-[var(--radius-card)] border border-line bg-paper p-6 print:border-0 print:p-0 md:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div className="flex items-center gap-3">
          <Monogram className="w-9" />
          <div>
            <p className="text-lg font-bold">{inv.seller_name ?? "Al JAMAL Store | متجر الجمال"}</p>
            {inv.seller_tax_number ? <p className="text-xs text-muted">الرقم الضريبي: <span className="ltr">{inv.seller_tax_number}</span></p> : <p className="text-xs text-muted">فاتورة مبيعات — ليست فاتورة ضريبية</p>}
            {inv.store_phone && <p className="ltr text-xs text-muted">{inv.store_phone}</p>}
          </div>
        </div>
        <div className="text-start text-sm">
          <p className="font-bold">فاتورة <span className="ltr font-mono">{inv.invoice_no}</span></p>
          <p className="text-muted">التاريخ: {fmt(inv.issued_at)}</p>
          <p className="text-muted">الطلب: <span className="ltr font-mono">{inv.order_number}</span></p>
          {inv.status !== "issued" && <p className="mt-1 font-semibold text-danger">{inv.status === "refunded" ? "مستردة بالكامل" : "مستردة جزئيًا"} ({formatMoney(inv.refunded_amount, c)})</p>}
        </div>
      </header>
      <section className="py-5 text-sm">
        <p className="text-xs text-muted">إلى</p>
        <p className="font-semibold">{inv.customer_name}</p>
        <p className="ltr text-end">{inv.customer_phone}</p>
        <p className="text-ink-soft">{inv.address_ar}</p>
      </section>
      <table className="w-full text-sm">
        <thead className="border-y border-line text-xs text-muted"><tr><th className="py-2 text-start">المنتج</th><th className="text-start">الكمية</th><th className="text-start">السعر</th><th className="text-end">المجموع</th></tr></thead>
        <tbody className="divide-y divide-line">
          {inv.lines.map((l, i) => (
            <tr key={i}><td className="py-2">{l.name}{l.variant && <span className="block text-xs text-muted">{l.variant}</span>}</td><td>{l.qty}</td><td>{formatMoney(l.unit, c)}</td><td className="text-end">{formatMoney(l.total, c)}</td></tr>
          ))}
        </tbody>
      </table>
      <dl className="ms-auto mt-4 max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-muted">المنتجات</dt><dd>{formatMoney(inv.subtotal, c)}</dd></div>
        {toMills(inv.discount_total) > 0 && <div className="flex justify-between"><dt className="text-muted">الخصم</dt><dd>− {formatMoney(inv.discount_total, c)}</dd></div>}
        <div className="flex justify-between"><dt className="text-muted">التوصيل</dt><dd>{formatMoney(inv.shipping_cost, c)}</dd></div>
        {toMills(inv.fees_total) > 0 && <div className="flex justify-between"><dt className="text-muted">{inv.fees_label ?? "رسوم"}</dt><dd>{formatMoney(inv.fees_total, c)}</dd></div>}
        <div className="flex justify-between border-t border-line pt-2 font-bold"><dt>الإجمالي</dt><dd>{formatMoney(inv.total, c)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">المدفوع ({label(t.paymentMethod, inv.payment_method)})</dt><dd>{formatMoney(inv.amount_paid, c)}</dd></div>
        {inv.payment_reference && <div className="flex justify-between text-xs text-muted"><dt>مرجع الدفع</dt><dd className="ltr">{inv.payment_reference}</dd></div>}
      </dl>
      {inv.footer && <p className="mt-8 border-t border-line pt-4 text-xs leading-6 text-muted">{inv.footer}</p>}
      <div className="mt-8 print:hidden"><PrintButton /></div>
    </article>
  );
}
