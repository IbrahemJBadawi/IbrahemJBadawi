import Link from "next/link";
import { withAdmin } from "@/lib/admin";
import { savePageAction } from "@/lib/actions/admin/operations";
import { AdminTitle, Details } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/States";

export const metadata = { title: "الصفحات والسياسات" };

const PUBLIC_PATH: Record<string, string> = { faq: "/faq", shipping: "/policies/shipping", returns: "/policies/returns", privacy: "/policies/privacy", terms: "/policies/terms" };

export default async function AdminPages() {
  const pages = await withAdmin((tx) =>
    tx.query<{ slug: string; title_ar: string; body_ar: string; is_published: boolean }>("select slug, title_ar, body_ar, is_published from public.pages order by slug"),
  );
  return (
    <div className="space-y-4">
      <AdminTitle title="الصفحات والسياسات" description="التنسيق المدعوم: «## » للعناوين، «- » للقوائم، وسطر فارغ بين الفقرات." />
      <Notice tone="warning">النصوص الحالية مبدئية. راجعها مع مختص قانوني وطابقها مع شروط الموردين وشركات الشحن قبل الإطلاق.</Notice>
      {pages.map((p) => (
        <Details key={p.slug} summary={<span>{p.title_ar} {PUBLIC_PATH[p.slug] && <Link href={PUBLIC_PATH[p.slug]} target="_blank" className="ms-2 text-xs text-beige-deep underline">عرض</Link>}</span>}>
          <ActionForm action={savePageAction} submitLabel="حفظ الصفحة" className="space-y-3">
            <input type="hidden" name="slug" value={p.slug} />
            <Field label="العنوان"><Input name="title_ar" defaultValue={p.title_ar} required /></Field>
            <Field label="المحتوى"><Textarea name="body_ar" rows={16} defaultValue={p.body_ar} /></Field>
            <Checkbox name="is_published" defaultChecked={p.is_published} label="منشورة" />
          </ActionForm>
        </Details>
      ))}
    </div>
  );
}
