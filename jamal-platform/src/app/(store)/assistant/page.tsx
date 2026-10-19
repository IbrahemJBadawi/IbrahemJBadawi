import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { asSystem, asUser } from "@/lib/db";
import { assistantConfigured } from "@/lib/ai/assistant";
import { aiEnabled, latestThread, threadMessages } from "@/lib/ai/store";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { Notice, PageHeader, Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "مساعد التسوق", robots: { index: false } };

async function Content() {
  const enabled = assistantConfigured() && (await asSystem(aiEnabled));
  if (!enabled) {
    return (
      <Notice tone="info">
        مساعد التسوق الذكي غير متاح حاليًا. يمكنك <Link href="/products" className="underline">تصفح المنتجات</Link> أو{" "}
        <Link href="/support" className="underline">التواصل مع الدعم</Link>.
      </Notice>
    );
  }
  const user = await getCurrentUser();
  const { threadId, messages } = user
    ? await asUser(user, async (tx) => {
        const id = await latestThread(tx);
        return { threadId: id, messages: id ? (await threadMessages(tx, id)).map(({ role, content }) => ({ role, content })) : [] };
      })
    : { threadId: null, messages: [] };
  return <AssistantChat signedIn={!!user} initialThreadId={threadId} initialMessages={messages} />;
}

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="تجريبي" title="مساعد التسوق" description="اسأل عن المنتجات والمقاسات والتوصيل. لا يمكن للمساعد تعديل الطلبات أو تأكيد الدفع." />
      <div className="container-page max-w-3xl py-6">
        <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
      </div>
    </>
  );
}
