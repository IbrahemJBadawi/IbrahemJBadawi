import type { Metadata } from "next";
import Link from "next/link";
import { deleteStaffMessageAction, pinStaffMessageAction, postStaffMessageAction } from "@/app/dashboard/community-actions";
import { Composer } from "@/components/messages/Composer";
import { Thread, type ThreadMessage } from "@/components/messages/Thread";
import { Alert, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "رسائل الإدارة" };

type Channel = { scope: "center" | "organization"; scope_id: string; name: string; parent_name: string | null; can_manage: boolean; last_at: string | null };

export default async function StaffMessagesPage({ searchParams }: PageProps<"/dashboard/staff-messages">) {
  await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_staff_channels");
  const channels = (data ?? []) as Channel[];
  const key = (c: Channel) => `${c.scope}:${c.scope_id}`;
  const selected = channels.find((c) => key(c) === sp.c) ?? channels[0];

  let messages: ThreadMessage[] = [];
  let error: string | null = null;
  if (selected) {
    const res = await supabase.rpc("get_staff_messages", { p_scope: selected.scope, p_id: selected.scope_id, p_limit: 100 });
    messages = ((res.data ?? []) as ThreadMessage[]).slice().reverse();
    if (res.error) error = "تعذّر تحميل الرسائل.";
  }

  return (
    <>
      <PageHeader title="رسائل الإدارة" description="قنوات للبالغين فقط: محفّظو المركز وأميره، وأمراء المراكز وإدارة الدار." />
      {channels.length === 0 ? (
        <EmptyState title="لا توجد قنوات لك">تظهر هنا قناة المركز إن كنت محفّظًا أو أميرًا في مركز، وقناة الدار إن كنت في إدارتها أو أميرًا لأحد مراكزها.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <nav aria-label="القنوات" className="flex flex-wrap gap-2">
            {channels.map((c) => (
              <Link key={key(c)} href={`/dashboard/staff-messages?c=${key(c)}`} aria-current={selected && key(c) === key(selected) ? "page" : undefined}
                className={cx("btn !min-h-9 !px-3 text-sm", selected && key(c) === key(selected) ? "btn-primary" : "btn-secondary")}>
                {c.scope === "organization" ? "🏛️ دار: " : "🕌 مركز: "}{c.name}
              </Link>
            ))}
          </nav>
          {selected && (
            <p className="text-sm text-muted">
              {selected.scope === "organization"
                ? "يرى هذه القناة إدارة الدار وأمراء مراكزها."
                : `يرى هذه القناة أمير المركز ومحفّظوه${selected.parent_name ? ` وإدارة «${selected.parent_name}»` : ""}.`}
            </p>
          )}
          {error ? <Alert tone="error">{error}</Alert> : (
            <Thread
              messages={messages}
              roleLabel={(r) => r}
              canManage={Boolean(selected?.can_manage)}
              onPin={pinStaffMessageAction}
              onDelete={deleteStaffMessageAction}
            />
          )}
          {selected && (
            <Card>
              <Composer
                action={postStaffMessageAction}
                hidden={{ scope: selected.scope, scopeId: selected.scope_id }}
                canAnnounce={selected.can_manage}
                placeholder="اكتب رسالتك للقناة…"
                note="الإعلانات متاحة للإدارة."
              />
            </Card>
          )}
        </div>
      )}
    </>
  );
}
