import { withAdmin } from "@/lib/admin";
import { saveSettingsAction } from "@/lib/actions/admin/operations";
import { authProvider } from "@/lib/auth";
import { storageMode } from "@/lib/storage";
import { AdminTitle, Card } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";

export const metadata = { title: "الإعدادات" };

export default async function AdminSettings() {
  const { s, currencies } = await withAdmin(async (tx) => {
    const [s] = await tx.query<Record<string, string | boolean | null>>("select * from public.store_settings where id = 1");
    const currencies = await tx.query<{ code: string }>("select code from public.currencies where is_active order by code");
    return { s, currencies };
  });
  const v = (k: string) => (s[k] as string | null) ?? "";
  return (
    <div className="space-y-6">
      <AdminTitle title="إعدادات المتجر" />
      <Card>
        <ActionForm action={saveSettingsAction} submitLabel="حفظ الإعدادات" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم المتجر بالعربية"><Input name="store_name_ar" required defaultValue={v("store_name_ar")} /></Field>
            <Field label="الاسم اللاتيني"><Input name="store_name_en" dir="ltr" required defaultValue={v("store_name_en")} /></Field>
            <Field label="الشعار النصي القصير"><Input name="tagline_ar" defaultValue={v("tagline_ar")} /></Field>
            <Field label="شريط الإعلان أعلى الموقع" hint="اتركه فارغًا لإخفائه"><Input name="announcement_ar" defaultValue={v("announcement_ar")} /></Field>
            <Field label="بريد التواصل"><Input name="contact_email" type="email" dir="ltr" defaultValue={v("contact_email")} /></Field>
            <Field label="هاتف التواصل"><Input name="contact_phone" dir="ltr" defaultValue={v("contact_phone")} /></Field>
            <Field label="واتساب (مع رمز الدولة)"><Input name="whatsapp" dir="ltr" defaultValue={v("whatsapp")} /></Field>
            <Field label="العملة الافتراضية للمنتجات الجديدة">
              <Select name="default_currency" defaultValue={v("default_currency")}>{currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</Select>
            </Field>
          </div>
          <fieldset className="space-y-2 rounded-md border border-line p-4">
            <legend className="px-1 text-sm font-bold">طرق الطلب</legend>
            <Checkbox name="cod_enabled" defaultChecked={!!s.cod_enabled} label="تفعيل الدفع عند الاستلام (يظهر فقط إذا كانت منطقة الشحن والمورد يدعمانه أيضًا)" />
            <Checkbox name="manual_orders_enabled" defaultChecked={!!s.manual_orders_enabled} label="تفعيل الطلب اليدوي (نتواصل مع العميل لتأكيد الطلب والدفع)" />
            <p className="text-xs text-muted">الدفع الإلكتروني غير متاح: لم يتم ربط أي مزود دفع.</p>
          </fieldset>
        </ActionForm>
      </Card>
      <Card title="حالة التكاملات">
        <ul className="space-y-1 text-sm">
          <li>المصادقة: <strong>{authProvider() === "supabase" ? "Supabase Auth" : "محلية (بريد + كلمة مرور)"}</strong></li>
          <li>قاعدة البيانات: <strong>{process.env.DATABASE_URL ? "Postgres خارجي (DATABASE_URL)" : "PGlite محلية — للتطوير فقط"}</strong></li>
          <li>تخزين الصور: <strong>{storageMode() === "supabase" ? "Supabase Storage" : "مجلد محلي .data/uploads — للتطوير فقط"}</strong></li>
          <li>الدفع الإلكتروني: <strong>غير مفعّل</strong> · التكامل الآلي مع الموردين: <strong>غير مفعّل (يدوي)</strong></li>
        </ul>
      </Card>
    </div>
  );
}
