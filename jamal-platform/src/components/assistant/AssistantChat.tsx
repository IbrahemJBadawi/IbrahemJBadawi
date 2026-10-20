"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { askAssistantAction } from "@/lib/actions/assistant";
import { Button } from "@/components/ui/Button";

type Msg = { role: "user" | "assistant"; content: string };

const GUEST_KEY = "jamal.assistant.guest";
const SUGGESTIONS = ["أبحث عن عباية سوداء للمناسبات", "شو العروض المتوفرة؟", "كم رسوم التوصيل لنابلس؟"];

/** Renders internal links only ([text](/path) or bare /product/…); everything else is plain text. */
function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /\[([^\]]{1,120})\]\((\/[a-z0-9\-/]{1,120})\)|(\/(?:product\/[a-z0-9-]+|track|support|offers|products))/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  const clean = text.replace(/\*\*/g, "");
  while ((m = re.exec(clean))) {
    if (m.index > last) parts.push(clean.slice(last, m.index));
    const href = m[2] ?? m[3];
    parts.push(
      <Link key={m.index} href={href} className="font-semibold underline underline-offset-2">
        {m[1] ?? (href.startsWith("/product/") ? "عرض المنتج" : href)}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  parts.push(clean.slice(last));
  return <p className="whitespace-pre-line break-words">{parts}</p>;
}

export function AssistantChat({ signedIn, initialThreadId, initialMessages }: { signedIn: boolean; initialThreadId: string | null; initialMessages: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [threadId, setThreadId] = useState(initialThreadId);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Guests: restore the last conversation kept in this browser only.
  useEffect(() => {
    if (signedIn || loaded.current) return;
    loaded.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(GUEST_KEY) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage after hydration
      if (Array.isArray(saved) && saved.length) setMessages(saved.slice(-12));
    } catch {}
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) try { sessionStorage.setItem(GUEST_KEY, JSON.stringify(messages.slice(-12))); } catch {}
    end.current?.scrollIntoView({ block: "end" });
  }, [messages, signedIn]);

  function send(q: string) {
    const question = q.trim();
    if (!question || pending) return;
    setError(null);
    const history = messages.slice(-10);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setText("");
    start(async () => {
      const res = await askAssistantAction({ text: question, threadId, history: signedIn ? [] : history });
      if (res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
        setThreadId(res.threadId);
      } else {
        setError(res.error);
        setMessages((m) => m.slice(0, -1));
        setText(question);
      }
    });
  }

  function reset() {
    setMessages([]);
    setThreadId(null);
    setError(null);
    try { sessionStorage.removeItem(GUEST_KEY); } catch {}
  }

  return (
    <div className="flex min-h-[60vh] flex-col rounded-[var(--radius-card)] border border-line bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <p className="text-xs text-muted">المساعد يقترح منتجات من الكتالوج فقط. التوفّر والسعر النهائي يؤكدهما فريق المتجر قبل الدفع.</p>
        {messages.length > 0 && <Button variant="ghost" size="sm" onClick={reset} type="button">محادثة جديدة</Button>}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3 py-6 text-center">
            <p className="font-semibold">أهلًا! كيف أساعدك اليوم؟</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-sand">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-ink text-ivory" : "bg-sand text-ink"}`}>
              <span className="sr-only">{m.role === "user" ? "أنت: " : "المساعد: "}</span>
              {m.role === "assistant" ? <RichText text={m.content} /> : <p className="whitespace-pre-line break-words">{m.content}</p>}
            </div>
          </div>
        ))}
        {pending && <p className="text-end text-sm text-muted">المساعد يكتب…</p>}
        <div ref={end} />
      </div>
      {error && <p role="alert" className="px-4 pb-2 text-sm text-danger">{error}</p>}
      <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <label htmlFor="assistant-input" className="sr-only">سؤالك</label>
        <textarea
          id="assistant-input" rows={1} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
          placeholder="اسأل عن منتج، مقاس، أو التوصيل…"
          className="min-h-11 min-w-0 flex-1 resize-none rounded-[var(--radius-control)] border border-line px-3 py-2.5 text-sm"
        />
        <Button type="submit" disabled={pending || !text.trim()}>إرسال</Button>
      </form>
      {!signedIn && <p className="px-4 pb-3 text-xs text-muted">المحادثة تُحفظ في هذا المتصفح فقط حتى تغلقه. <Link href="/login?next=/assistant" className="underline">سجّل الدخول</Link> لحفظها في حسابك.</p>}
    </div>
  );
}
