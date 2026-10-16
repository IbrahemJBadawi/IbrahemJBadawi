import type { Metadata } from "next";
import Link from "next/link";
import { deleteMessageAction, pinMessageAction, setChatModeAction } from "@/app/dashboard/community-actions";
import { Icon } from "@/components/Icon";
import { Alert, Badge, Button, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { viewerHalaqat } from "@/lib/data/halaqat";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { Composer } from "./Composer";

export const metadata: Metadata = { title: "رسائل الحلقة" };

type Msg = {
  id: string; author_id: string; author_name: string; author_role: string; body: string;
  is_announcement: boolean; pinned: boolean; created_at: string; is_mine: boolean; can_delete: boolean;
};
const ROLE: Record<string, string> = { teacher: "المحفّظ", assistant: "مساعد", student: "طالب", former: "عضو سابق" };

export default async function MessagesPage({ searchParams }: PageProps<"/dashboard/messages">) {
  const user = await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();
  const halaqat = await viewerHalaqat(supabase, user.id);
  const selected = halaqat.find((h) => h.id === sp.h) ?? halaqat[0];

  let messages: Msg[] = [];
  let error: string | null = null;
  if (selected) {
    const res = await supabase.rpc("get_halaqa_messages", { p_halaqa: selected.id, p_limit: 100 });
    messages = ((res.data ?? []) as Msg[]).slice().reverse();
    if (res.error) error = "تعذّر تحميل الرسائل.";
  }
  const pinned = messages.filter((m) => m.pinned);
  const isStudent = selected && !selected.staff && user.roles.includes("student");
  const canPost = selected && (selected.staff || (isStudent && selected.chat_students_can_post));

  return (
    <>
      <PageHeader title="رسائل الحلقة" description="إعلانات المحفّظ ورسائل الحلقة. لا توجد رسائل خاصة بين البالغين والطلاب." />
      {halaqat.length === 0 ? (
        <EmptyState title="لا توجد حلقات">انضم إلى حلقة لتصلك إعلاناتها. <Link href="/halaqat" className="font-semibold underline">ابحث عن حلقة</Link></EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {halaqat.length > 1 && (
            <nav aria-label="اختر الحلقة" className="flex flex-wrap gap-2">
              {halaqat.map((h) => (
                <Link key={h.id} href={`/dashboard/messages?h=${h.id}`} aria-current={h.id === selected?.id ? "page" : undefined} className={cx("btn !min-h-9 !px-3 text-sm", h.id === selected?.id ? "btn-primary" : "btn-secondary")}>{h.name}</Link>
              ))}
            </nav>
          )}
          {selected?.staff && (
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">{selected.chat_students_can_post ? "الطلاب يستطيعون الكتابة في هذه الحلقة." : "الكتابة للمحفّظ فقط (إعلانات)."}</p>
              <form action={setChatModeAction}>
                <input type="hidden" name="halaqaId" value={selected.id} />
                <input type="hidden" name="open" value={selected.chat_students_can_post ? "0" : "1"} />
                <Button type="submit" variant="secondary" className="!min-h-9 text-sm">{selected.chat_students_can_post ? "اجعلها للإعلانات فقط" : "اسمح للطلاب بالكتابة"}</Button>
              </form>
            </Card>
          )}
          {pinned.length > 0 && (
            <Card className="border-gold/60 bg-gold-50">
              {pinned.map((m) => (
                <p key={m.id} className="flex items-start gap-2"><Icon name="pin" className="mt-1 shrink-0 text-gold-dark" /><span><strong>{m.author_name}:</strong> {m.body}</span></p>
              ))}
            </Card>
          )}
          <Card>
            {error ? <Alert tone="error">{error}</Alert> : messages.length === 0 ? <p className="py-6 text-center text-muted">لا توجد رسائل بعد.</p> : (
              <ol className="flex flex-col gap-3" aria-label="الرسائل">
                {messages.map((m) => (
                  <li key={m.id} className={cx("flex", m.is_mine ? "justify-start" : "justify-end")}>
                    <div className={cx("max-w-[85%] rounded-[18px] px-3.5 py-2.5", m.is_announcement ? "border border-brand-600/40 bg-brand-100" : m.is_mine ? "bg-brand-fill text-white" : "bg-deep")}>
                      <p className={cx("mb-0.5 flex flex-wrap items-center gap-1.5 text-xs", m.is_mine && !m.is_announcement ? "text-white/80" : "text-muted")}>
                        <strong className={m.is_mine && !m.is_announcement ? "text-white" : "text-ink"}>{m.is_mine ? "أنت" : m.author_name}</strong>
                        · {ROLE[m.author_role] ?? ""}
                        {m.is_announcement && <Badge tone="green">📣 إعلان</Badge>}
                      </p>
                      <p className="whitespace-pre-line">{m.body}</p>
                      <div className={cx("mt-1 flex items-center gap-2 text-[0.7rem]", m.is_mine && !m.is_announcement ? "text-white/70" : "text-muted")}>
                        <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
                        {selected?.staff && (
                          <form action={pinMessageAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="pinned" value={m.pinned ? "0" : "1"} />
                            <button type="submit" className="underline">{m.pinned ? "إلغاء التثبيت" : "تثبيت"}</button>
                          </form>
                        )}
                        {m.can_delete && (
                          <form action={deleteMessageAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <button type="submit" className="underline">حذف</button>
                          </form>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          {selected && (canPost ? (
            <Card><Composer halaqaId={selected.id} staff={selected.staff} /></Card>
          ) : (
            <p className="text-center text-sm text-muted">{isStudent ? "المحفّظ جعل هذه الحلقة للإعلانات فقط." : "يمكنك متابعة الرسائل والإعلانات فقط."}</p>
          ))}
        </div>
      )}
    </>
  );
}
