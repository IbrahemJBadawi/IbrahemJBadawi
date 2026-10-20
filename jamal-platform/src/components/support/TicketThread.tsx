import type { TicketMessage } from "@/lib/data/tickets";

const fmt = (s: string) => new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));

/** Chat-style thread. `staffView` shows internal notes and right/left from the staff point of view. */
export function TicketThread({ messages, staffView = false }: { messages: TicketMessage[]; staffView?: boolean }) {
  return (
    <ol className="space-y-3">
      {messages.map((m) => {
        const mine = staffView ? m.author_kind === "staff" : m.author_kind === "customer";
        return (
          <li key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${m.is_internal ? "border border-dashed border-warning/50 bg-warning/5" : mine ? "bg-ink text-ivory" : "border border-line bg-paper"}`}>
              <p className={`mb-1 text-[0.7rem] ${mine && !m.is_internal ? "text-ivory/70" : "text-muted"}`}>
                {m.is_internal ? "ملاحظة داخلية" : m.author_kind === "staff" ? "فريق متجر الجمال" : m.author_kind === "system" ? "النظام" : "العميل"}
                {m.author ? ` · ${m.author}` : ""} · {fmt(m.created_at)}
              </p>
              <p className="whitespace-pre-line">{m.body_ar}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
