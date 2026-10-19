import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { listMyTickets } from "@/lib/data/tickets";
import { createTicketAction } from "@/lib/actions/support";
import { label, t } from "@/lib/i18n/ar";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { PageHeader, Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "الدعم وخدمة العملاء", alternates: { canonical: "/support" } };

async function Content({ searchParams }: { searchParams: PageProps<"/support">["searchParams"] }) {
  const sp = await searchParams;
  const order = typeof sp.order === "string" ? sp.order.slice(0, 40) : "";
  const user = await getCurrentUser();
  const tickets = user ? await listMyTickets(user) : [];
  return (
    <div className="container-page grid gap-10 py-10 md:grid-cols-[1fr_20rem]">
      <section>
        <h2 className="mb-4 text-lg font-bold">فتح تذكرة جديدة</h2>
        <ActionForm action={createTicketAction} submitLabel="إرسال التذكرة" pendingLabel="جارٍ الإرسال…" className="max-w-xl space-y-4">
          {!user && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الاسم"><Input name="guestName" required autoComplete="name" /></Field>
              <Field label="رقم الهاتف"><Input name="guestPhone" type="tel" dir="ltr" className="text-end" required autoComplete="tel" /></Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نوع المشكلة">
              <Select name="category" defaultValue={order ? "order" : "other"}>
                {Object.entries(t.ticketCategory).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="رقم الطلب (إن وجد)" hint="يُربط فقط إذا كان الطلب لك">
              <Input name="orderNumber" dir="ltr" className="text-end font-mono uppercase" defaultValue={order} />
            </Field>
          </div>
          <Field label="العنوان"><Input name="subject" required maxLength={160} /></Field>
          <Field label="التفاصيل"><Textarea name="body" rows={5} required /></Field>
          {!user && <p className="text-xs text-muted">ستحصل على رابط خاص لمتابعة التذكرة. <Link href="/login?next=/support" className="underline">سجّل الدخول</Link> لتجد تذاكرك في حسابك.</p>}
        </ActionForm>
      </section>
      <aside>
        <h2 className="mb-4 text-lg font-bold">تذاكري</h2>
        {!user ? (
          <p className="text-sm text-muted">سجّل الدخول لعرض تذاكرك السابقة.</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted">لا توجد تذاكر بعد.</p>
        ) : (
          <ul className="space-y-2">
            {tickets.map((tk) => (
              <li key={tk.id}>
                <Link href={`/support/${tk.code}`} className="block rounded-[var(--radius-control)] border border-line bg-paper p-3 hover:border-ink/40">
                  <span className="flex items-center justify-between gap-2 text-sm"><span className="ltr font-mono font-semibold">{tk.code}</span><Badge tone={tk.status === "waiting_customer" ? "warning" : "neutral"}>{label(t.ticketStatus, tk.status)}</Badge></span>
                  <span className="mt-1 line-clamp-1 block text-sm">{tk.subject_ar}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

export default function SupportPage({ searchParams }: PageProps<"/support">) {
  return (
    <>
      <PageHeader title="الدعم وخدمة العملاء" description="افتح تذكرة لأي مشكلة في طلب أو دفع أو توصيل أو إرجاع، وسيرد عليك فريقنا هنا." />
      <Suspense fallback={<div className="container-page py-10"><Skeleton className="h-80 w-full" /></div>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
