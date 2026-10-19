import { withAdmin } from "@/lib/admin";
import { savePaymentSettingsAction, saveSettingsAction } from "@/lib/actions/admin/operations";
import { authProvider } from "@/lib/auth";
import { storageMode } from "@/lib/storage";
import { AdminTitle, Card } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";

export const metadata = { title: "الإعدادات" };

export default async function AdminSettings() {
  const { s, currencies, pay } = await withAdmin(async (tx) => {
    const [s] = await tx.query<Record<string, string | boolean | null>>("select * from public.store_settings where id = 1");
    const currencies = await tx.query<{ code: string }>("select code from public.currencies where is_active order by code");
    const [pay] = await tx.query<{ bank_transfer_enabled: boolean; beneficiary_name: string | null; bank_name: string | null; transfer_details: string | null; instructions: string | null; validity_hours: number | null; proof_review_policy: string | null; contact: string | null }>(
      "select bank_transfer_enabled, beneficiary_name, bank_name, transfer_details, instructions, validity_hours, proof_review_policy, contact from public.payment_settings where id = 1",
    );
    return { s, currencies, pay };
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
          <fieldset className="grid gap-4 rounded-md border border-line p-4 md:grid-cols-2">
            <legend className="px-1 text-sm font-bold">الفواتير</legend>
            <Field label="الاسم القانوني للبائع"><Input name="legal_name" defaultValue={v("legal_name")} /></Field>
            <Field label="الرقم الضريبي (إن وجد)" hint="بدونه تظهر الفاتورة «ليست فاتورة ضريبية»"><Input name="tax_number" dir="ltr" defaultValue={v("tax_number")} /></Field>
            <Field label="تذييل الفاتورة" className="md:col-span-2"><Input name="invoice_footer" defaultValue={v("invoice_footer")} placeholder="مثل: سياسة الإرجاع خلال 7 أيام…" /></Field>
          </fieldset>
          <fieldset className="space-y-2 rounded-md border border-line p-4">
            <legend className="px-1 text-sm font-bold">المساعد الذكي</legend>
            <Checkbox name="ai_assistant_enabled" defaultChecked={!!s.ai_assistant_enabled} label="تفعيل مساعد التسوق الذكي للعملاء" />
            <p className="text-xs leading-6 text-muted">
              يتطلب مفتاح GEMINI_API_KEY في إعدادات الخادم ({process.env.GEMINI_API_KEY ? "موجود" : "غير موجود — المساعد مخفي عن العملاء"}). خطة Gemini المجانية لها حد يومي من Google، وهنا أيضًا حد يومي لكل مستخدم.
            </p>
          </fieldset>
          <fieldset className="space-y-2 rounded-md border border-line p-4">
            <legend className="px-1 text-sm font-bold">طرق الطلب</legend>
            <Checkbox name="cod_enabled" defaultChecked={!!s.cod_enabled} label="تفعيل الدفع عند الاستلام (يظهر فقط إذا كانت منطقة الشحن والمورد يدعمانه أيضًا)" />
            <Checkbox name="manual_orders_enabled" defaultChecked={!!s.manual_orders_enabled} label="استقبال الطلبات بالتحويل البنكي بعد اعتماد السعر" />
            <p className="text-xs text-muted">الدفع الإلكتروني غير متاح: لم يتم ربط أي مزود دفع.</p>
          </fieldset>
        </ActionForm>
      </Card>
      <Card title="إعدادات التحويل البنكي">
        <p className="mb-4 text-xs leading-6 text-muted">
          تظهر هذه البيانات للعميل فقط داخل صفحة طلبه بعد اعتماد السعر. أدخل فقط ما توافق على نشره، ولا تُدخل أبدًا كلمات مرور أو بيانات دخول بنكية.
          هذه الحقول فارغة عمدًا حتى تدخل البيانات الصحيحة بنفسك.
        </p>
        <ActionForm action={savePaymentSettingsAction} submitLabel="حفظ إعدادات التحويل" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم المستفيد"><Input name="beneficiary_name" defaultValue={pay?.beneficiary_name ?? ""} /></Field>
            <Field label="اسم البنك"><Input name="bank_name" defaultValue={pay?.bank_name ?? ""} placeholder="مثل: بنك فلسطين" /></Field>
          </div>
          <Field label="تفاصيل التحويل التي توافق على نشرها" hint="مثل رقم الحساب أو IBAN أو رقم المحفظة — كما تريد أن تظهر للعميل.">
            <Textarea name="transfer_details" dir="ltr" rows={3} defaultValue={pay?.transfer_details ?? ""} />
          </Field>
          <Field label="تعليمات الدفع"><Textarea name="instructions" rows={3} defaultValue={pay?.instructions ?? ""} placeholder="مثل: حوّل المبلغ كاملًا واكتب رقم الطلب في الملاحظة ثم ارفع صورة الإيصال." /></Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="صلاحية التعليمات الافتراضية (ساعات)"><Input name="validity_hours" type="number" min={1} max={720} defaultValue={pay?.validity_hours ?? ""} /></Field>
            <Field label="وسيلة تواصل للاستفسارات"><Input name="contact" dir="ltr" defaultValue={pay?.contact ?? ""} /></Field>
          </div>
          <Field label="سياسة مراجعة إثباتات التحويل"><Textarea name="proof_review_policy" rows={2} defaultValue={pay?.proof_review_policy ?? ""} placeholder="مثل: نراجع الإثباتات خلال يوم عمل، ولا يُعتبر الطلب مدفوعًا قبل وصول المبلغ إلى الحساب." /></Field>
          <Checkbox name="bank_transfer_enabled" defaultChecked={!!pay?.bank_transfer_enabled} label="عرض تعليمات التحويل للعملاء" />
        </ActionForm>
      </Card>
      <Card title="حالة التكاملات">
        <ul className="space-y-1 text-sm">
          <li>المصادقة: <strong>{authProvider() === "supabase" ? "Supabase Auth" : "محلية (بريد + كلمة مرور)"}</strong></li>
          <li>قاعدة البيانات: <strong>{process.env.DATABASE_URL ? "Postgres خارجي (DATABASE_URL)" : "PGlite محلية — للتطوير فقط"}</strong></li>
          <li>تخزين الصور: <strong>{storageMode() === "supabase" ? "Supabase Storage" : "مجلد محلي .data/uploads — للتطوير فقط"}</strong></li>
          <li>الدفع: <strong>تحويل بنكي يُتحقق منه يدويًا</strong> — لا بوابة دفع ولا ربط مصرفي.</li>
          <li>التكامل مع الموردين وشركات التوصيل: <strong>غير موجود (يدوي)</strong></li>
          <li>البريد الإلكتروني للإشعارات: <strong>{process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "مزود Resend مُعد — تُرسل الرسائل عند تشغيل الجدولة" : "غير مُعد — الإشعارات داخل المنصة فقط والرسائل تبقى في الطابور"}</strong></li>
        </ul>
      </Card>
    </div>
  );
}
