import type { Metadata } from "next";
import { Suspense } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { getStoreSettings } from "@/lib/data/catalog";
import { contactAction } from "@/lib/actions/contact";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/States";

export const metadata: Metadata = { title: "اتصل بنا", description: "تواصل مع فريق متجر الجمال.", alternates: { canonical: "/contact" } };

async function Channels() {
  const s = await getStoreSettings();
  const items = [
    s?.contact_email && { icon: Mail, label: "البريد الإلكتروني", value: s.contact_email, href: `mailto:${s.contact_email}` },
    s?.contact_phone && { icon: Phone, label: "الهاتف", value: s.contact_phone, href: `tel:${s.contact_phone.replace(/\s/g, "")}` },
    s?.whatsapp && { icon: MessageCircle, label: "واتساب", value: s.whatsapp, href: `https://wa.me/${s.whatsapp.replace(/[^0-9]/g, "")}` },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href: string }[];
  if (!items.length) return <p className="text-sm text-muted">استخدم النموذج وسنرد عليك في أقرب وقت.</p>;
  return (
    <ul className="space-y-4">
      {items.map(({ icon: Icon, label, value, href }) => (
        <li key={label}>
          <a href={href} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4 hover:border-ink/40" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            <Icon className="size-5 text-beige-deep" strokeWidth={1.5} />
            <span>
              <span className="block text-xs text-muted">{label}</span>
              <span className="ltr text-sm font-semibold">{value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function ContactPage() {
  return (
    <>
      <PageHeader title="اتصل بنا" description="لأي استفسار عن منتج أو طلب، راسلنا وسنرد عليك." />
      <div className="container-page grid gap-10 py-10 md:grid-cols-[1fr_20rem]">
        <ActionForm action={contactAction} submitLabel="إرسال" pendingLabel="جارٍ الإرسال…" resetOnSuccess className="max-w-xl space-y-5">
          <div aria-hidden className="hidden">
            <label>اتركه فارغًا <input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <Field label="الاسم" htmlFor="name"><Input id="name" name="name" required autoComplete="name" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="البريد الإلكتروني" htmlFor="email"><Input id="email" name="email" type="email" dir="ltr" className="text-end" autoComplete="email" /></Field>
            <Field label="الهاتف" htmlFor="phone"><Input id="phone" name="phone" type="tel" dir="ltr" className="text-end" autoComplete="tel" /></Field>
          </div>
          <Field label="الموضوع (اختياري)" htmlFor="subject" hint="مثل: استفسار عن الطلب JM…"><Input id="subject" name="subject" /></Field>
          <Field label="الرسالة" htmlFor="message"><Textarea id="message" name="message" rows={5} required /></Field>
        </ActionForm>
        <aside>
          <h2 className="mb-4 text-base font-bold">قنوات التواصل</h2>
          <Suspense fallback={null}><Channels /></Suspense>
        </aside>
      </div>
    </>
  );
}
