import type { Metadata } from "next";
import Link from "next/link";
import { deleteMessageAction, pinMessageAction, postMessageAction, setChatModeAction } from "@/app/dashboard/community-actions";
import { Alert, Button, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { viewerHalaqat } from "@/lib/data/halaqat";
import { createClient } from "@/lib/supabase/server";
import { Composer } from "@/components/messages/Composer";
import { Thread, type ThreadMessage } from "@/components/messages/Thread";

export const metadata: Metadata = { title: "رسائل الحلقة" };

type Msg = ThreadMessage & { author_id: string };
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
          {error ? <Alert tone="error">{error}</Alert> : (
            <Thread messages={messages} roleLabel={(r) => ROLE[r] ?? ""} canManage={Boolean(selected?.staff)} onPin={pinMessageAction} onDelete={deleteMessageAction} />
          )}
          {selected && (canPost ? (
            <Card>
              <Composer
                action={postMessageAction}
                hidden={{ halaqaId: selected.id }}
                canAnnounce={selected.staff}
                placeholder={selected.staff ? "اكتب رسالة أو إعلانًا للحلقة…" : "اكتب رسالتك للحلقة…"}
                note="يرى رسالتك المعلّم وزملاؤك وأولياء الأمور في الحلقة."
              />
            </Card>
          ) : (
            <p className="text-center text-sm text-muted">{isStudent ? "المحفّظ جعل هذه الحلقة للإعلانات فقط." : "يمكنك متابعة الرسائل والإعلانات فقط."}</p>
          ))}
        </div>
      )}
    </>
  );
}
