import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BadgePercent, PackageCheck, Truck, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { asSystem } from "@/lib/db";
import { supplierForUser } from "@/lib/suppliers/portal";
import { listGovernorates } from "@/lib/data/supplier";
import { applySupplierAction } from "@/lib/actions/supplier";
import { ActionForm } from "@/components/forms/ActionForm";
import { SupplierProfileFields } from "@/components/supplier/ProfileFields";
import { ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { Notice, Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "انضم كمورد", description: "اعرض منتجاتك على منصة الجمال ووصل لعملاء في كل فلسطين." };

const PERKS = [
  { icon: BadgePercent, title: "بدون رسوم اشتراك", text: "تضيف منتجاتك مجانًا، ونربح فقط عندما تبيع." },
  { icon: PackageCheck, title: "بدون مخزون إضافي", text: "نرسل لك الطلب بعد تأكيد دفع العميل، فتجهّز ما بيع فعلًا." },
  { icon: Wallet, title: "مستحقات واضحة", text: "نحوّل مستحقاتك بعد تحصيل ثمن الطلب، وكل حركة موثّقة." },
  { icon: Truck, title: "عملاء من كل فلسطين", text: "من جنين حتى رفح، نحن نجلب الطلبات وأنت تركّز على منتجك." },
];

async function Form() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-paper p-6 text-center">
        <p className="font-semibold">ابدأ بحساب مجاني</p>
        <p className="mt-1 text-sm text-muted">أنشئ حسابك أو ادخل، ثم أكمل بيانات متجرك في دقيقة.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/register?next=/suppliers/join">إنشاء حساب</ButtonLink>
          <ButtonLink href="/login?next=/suppliers/join" variant="outline">لدي حساب</ButtonLink>
        </div>
      </div>
    );
  }
  if (user.role === "admin") return <Notice>أنت مدير المنصة. يمكنك إدارة الموردين من <Link href="/admin/suppliers" className="underline">لوحة الإدارة</Link>.</Notice>;
  if (await asSystem((tx) => supplierForUser(tx, user.id))) redirect("/supplier");
  const governorates = await listGovernorates();
  return (
    <ActionForm action={applySupplierAction} submitLabel="إرسال طلب الانضمام" pendingLabel="جارٍ الإرسال…" fullWidth className="space-y-5 rounded-[var(--radius-card)] border border-line bg-paper p-5">
      <SupplierProfileFields governorates={governorates} withName />
      <Checkbox
        name="acceptTerms"
        label={<>أوافق على أن المنصة تحدد سعر البيع للعميل، وأن أجهّز الطلبات المؤكدة في الوقت المتفق عليه، وعلى <Link href="/policies/terms" target="_blank" className="underline">الشروط</Link></>}
      />
    </ActionForm>
  );
}

export default function Page() {
  return (
    <div className="container-page grid gap-10 py-10 md:grid-cols-2 md:py-16">
      <section>
        <p className="eyebrow mb-3">للموردين وأصحاب المحلات</p>
        <h1 className="text-3xl font-extrabold leading-snug md:text-4xl">
          اعرض منتجاتك على <span className="rounded-full bg-ink px-3 text-ivory">الجمال</span> وبِع في كل فلسطين
        </h1>
        <p className="mt-4 max-w-md leading-8 text-muted">سجّل متجرك، أضف منتجاتك بصورها وأسعارك، ونحن نتولى العرض والتسويق والدفع وخدمة العملاء.</p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-[var(--radius-card)] bg-paper p-4">
              <Icon className="size-6 text-beige-deep" strokeWidth={1.6} />
              <p className="mt-2 text-sm font-bold">{title}</p>
              <p className="mt-1 text-xs leading-6 text-muted">{text}</p>
            </li>
          ))}
        </ul>
        <ol className="mt-8 space-y-2 text-sm text-ink-soft">
          <li>١. سجّل بيانات متجرك.</li>
          <li>٢. نراجع طلبك ونتواصل معك.</li>
          <li>٣. أضف منتجاتك، ننشرها، وتبدأ الطلبات بالوصول.</li>
        </ol>
      </section>
      <section>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Form />
        </Suspense>
      </section>
    </div>
  );
}
