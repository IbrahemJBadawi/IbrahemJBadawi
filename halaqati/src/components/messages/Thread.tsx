import { Icon } from "@/components/Icon";
import { Badge, Card, cx } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export type ThreadMessage = {
  id: string; author_name: string; author_role: string; body: string;
  is_announcement: boolean; pinned: boolean; created_at: string; is_mine: boolean; can_delete: boolean;
};

type Action = (fd: FormData) => Promise<void>;

/** A conversation thread shared by halaqa messages and staff channels. */
export function Thread({
  messages, roleLabel, canManage, onPin, onDelete,
}: {
  messages: ThreadMessage[];
  roleLabel: (role: string) => string;
  canManage: boolean;
  onPin: Action;
  onDelete: Action;
}) {
  const pinned = messages.filter((m) => m.pinned);
  return (
    <>
      {pinned.length > 0 && (
        <Card className="border-gold/50 bg-gold-50">
          {pinned.map((m) => (
            <p key={m.id} className="flex items-start gap-2"><Icon name="pin" className="mt-1 shrink-0 text-gold-dark" /><span><strong>{m.author_name}:</strong> {m.body}</span></p>
          ))}
        </Card>
      )}
      <Card>
        {messages.length === 0 ? <p className="py-6 text-center text-muted">لا توجد رسائل بعد.</p> : (
          <ol className="flex flex-col gap-3" aria-label="الرسائل">
            {messages.map((m) => (
              <li key={m.id} className={cx("flex", m.is_mine ? "justify-start" : "justify-end")}>
                <div className={cx("max-w-[85%] rounded-[18px] px-3.5 py-2.5", m.is_announcement ? "border border-brand-600/30 bg-brand-100" : m.is_mine ? "bg-brand-100/70" : "bg-deep")}>
                  <p className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <strong className="text-ink">{m.is_mine ? "أنت" : m.author_name}</strong>
                    · {roleLabel(m.author_role)}
                    {m.is_announcement && <Badge tone="green">📣 إعلان</Badge>}
                  </p>
                  <p className="whitespace-pre-line">{m.body}</p>
                  <div className="mt-1 flex items-center gap-3 text-[0.72rem] text-muted">
                    <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
                    {canManage && (
                      <form action={onPin}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="pinned" value={m.pinned ? "0" : "1"} />
                        <button type="submit" className="underline">{m.pinned ? "إلغاء التثبيت" : "تثبيت"}</button>
                      </form>
                    )}
                    {m.can_delete && (
                      <form action={onDelete}>
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
    </>
  );
}
