import { withAdmin } from "@/lib/admin";
import { deleteZoneAction, saveCountryAction, saveZoneAction, toggleCurrencyAction } from "@/lib/actions/admin/operations";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Card, Details } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "الدول والشحن" };

type Zone = { id: string; country_code: string; currency_code: string; governorate_id: string | null; governorate_name: string | null; estimated_cost: string | null; carrier: string | null; name_ar: string; rate: string; free_shipping_threshold: string | null; min_days: number; max_days: number; cod_available: boolean; is_active: boolean; notes: string | null };

type Gov = { id: string; country_code: string; name_ar: string };

function ZoneFields({ z, countries, currencies, governorates }: { z?: Zone; countries: { code: string; name_ar: string }[]; currencies: { code: string; is_active: boolean }[]; governorates: Gov[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="الدولة"><Select name="country_code" defaultValue={z?.country_code ?? "PS"}>{countries.map((c) => <option key={c.code} value={c.code}>{c.name_ar} ({c.code})</option>)}</Select></Field>
      <Field label="المحافظة" hint="اتركها «كل الدولة» لسعر موحد">
        <Select name="governorate_id" defaultValue={z?.governorate_id ?? ""}>
          <option value="">كل الدولة</option>
          {governorates.map((g) => <option key={g.id} value={g.id}>{g.name_ar}</option>)}
        </Select>
      </Field>
      <Field label="عملة الأسعار" hint="تُعرض المنطقة فقط لمنتجات بنفس العملة"><Select name="currency_code" defaultValue={z?.currency_code ?? "ILS"}>{currencies.map((c) => <option key={c.code} value={c.code}>{c.code}{c.is_active ? "" : " (غير مفعّلة)"}</option>)}</Select></Field>
      <Field label="الاسم الداخلي"><Input name="name_ar" required defaultValue={z?.name_ar} /></Field>
      <Field label="رسوم التوصيل على العميل"><Input name="rate" dir="ltr" required defaultValue={z?.rate ?? ""} /></Field>
      <Field label="تكلفة التوصيل المتوقعة عليك" hint="للربح المتوقع فقط"><Input name="estimated_cost" dir="ltr" defaultValue={z?.estimated_cost ?? ""} /></Field>
      <Field label="شركة التوصيل المعتادة"><Input name="carrier" defaultValue={z?.carrier ?? ""} /></Field>
      <Field label="شحن مجاني فوق (اختياري)"><Input name="free_shipping_threshold" dir="ltr" defaultValue={z?.free_shipping_threshold ?? ""} /></Field>
      <Field label="أقل مدة (أيام)"><Input name="min_days" type="number" min={0} defaultValue={z?.min_days ?? 3} /></Field>
      <Field label="أقصى مدة (أيام)"><Input name="max_days" type="number" min={0} defaultValue={z?.max_days ?? 10} /></Field>
      <Field label="ملاحظات"><Input name="notes" defaultValue={z?.notes ?? ""} /></Field>
      <Checkbox name="cod_available" defaultChecked={z?.cod_available} label="الدفع عند الاستلام متاح ومؤكد في هذه الدولة" />
      <Checkbox name="is_active" defaultChecked={z ? z.is_active : true} label="مفعّلة" />
    </div>
  );
}

export default async function AdminShipping() {
  const data = await withAdmin(async (tx) => ({
    currencies: await tx.query<{ code: string; name_ar: string; is_active: boolean }>("select code, name_ar, is_active from public.currencies order by is_active desc, code"),
    countries: await tx.query<{ code: string; name_ar: string; is_active: boolean; default_currency: string | null }>("select code, name_ar, is_active, default_currency from public.countries order by sort_order"),
    zones: await tx.query<Zone>(`select z.id, z.country_code, z.currency_code, z.governorate_id, g.name_ar as governorate_name, z.estimated_cost::text, z.carrier,
       z.name_ar, z.rate::text, z.free_shipping_threshold::text, z.min_days, z.max_days, z.cod_available, z.is_active, z.notes
       from public.shipping_zones z left join public.governorates g on g.id = z.governorate_id order by z.country_code, g.sort_order nulls first`),
    governorates: await tx.query<Gov>("select id, country_code, name_ar from public.governorates order by sort_order"),
  }));
  return (
    <div className="space-y-6">
      <AdminTitle title="مناطق التوصيل والدول والعملات" description="لا تفترض أن كل المناطق قابلة للتوصيل: أضف فقط المحافظات التي تأكدت من التوصيل إليها مع رسومها. لا يتم تحويل العملات." />
      <Card title="مناطق الشحن">
        <div className="space-y-2">
          {data.zones.map((z) => (
            <Details key={z.id} summary={<span className="inline-flex flex-wrap items-center gap-2">{z.name_ar} · {z.country_code} · {formatMoney(z.rate, z.currency_code)} · {z.min_days}–{z.max_days} يوم {z.cod_available && <Badge>COD</Badge>} {!z.is_active && <Badge tone="outline">معطلة</Badge>}</span>}>
              <ActionForm action={saveZoneAction} submitLabel="حفظ" className="space-y-3">
                <input type="hidden" name="id" value={z.id} />
                <ZoneFields z={z} countries={data.countries} currencies={data.currencies} governorates={data.governorates} />
              </ActionForm>
              <ActionForm action={deleteZoneAction} submitLabel="حذف المنطقة" size="sm" variant="ghost" confirm="حذف منطقة الشحن؟" className="mt-2">
                <input type="hidden" name="id" value={z.id} />
              </ActionForm>
            </Details>
          ))}
          {data.zones.length === 0 && <p className="text-sm text-warning">لا توجد مناطق شحن. أضف منطقة واحدة على الأقل ليتمكن العملاء من الطلب.</p>}
        </div>
        <div className="mt-5 rounded-md border border-dashed border-line p-4">
          <p className="mb-3 text-sm font-semibold">إضافة منطقة شحن</p>
          <ActionForm action={saveZoneAction} submitLabel="إضافة" resetOnSuccess className="space-y-3">
            <ZoneFields countries={data.countries} currencies={data.currencies} governorates={data.governorates} />
          </ActionForm>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title="الدول">
          <ul className="divide-y divide-line">
            {data.countries.map((c) => (
              <li key={c.code} className="py-2">
                <ActionForm action={saveCountryAction} submitLabel="حفظ" size="sm" variant="ghost" className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="code" value={c.code} />
                  <span className="w-28 text-sm font-semibold">{c.name_ar}</span>
                  <Select name="default_currency" defaultValue={c.default_currency ?? "USD"} className="h-8 w-24 py-0 text-xs" aria-label="العملة الافتراضية">
                    {data.currencies.map((x) => <option key={x.code} value={x.code}>{x.code}</option>)}
                  </Select>
                  <Checkbox name="is_active" defaultChecked={c.is_active} label="مفعّلة" />
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="العملات">
          <ul className="divide-y divide-line">
            {data.currencies.map((c) => (
              <li key={c.code} className="py-2">
                <ActionForm action={toggleCurrencyAction} submitLabel="حفظ" size="sm" variant="ghost" className="flex items-center gap-3">
                  <input type="hidden" name="code" value={c.code} />
                  <span className="w-40 text-sm"><strong>{c.code}</strong> — {c.name_ar}</span>
                  <Checkbox name="is_active" defaultChecked={c.is_active} label="مفعّلة" />
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
