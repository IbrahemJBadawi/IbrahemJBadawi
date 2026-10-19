import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { assistantAvailable } from "@/lib/ai/availability";
import { latestThread, threadMessages } from "@/lib/ai/store";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { PageHeader, Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "مساعد التسوق", robots: { index: false } };

async function Content() {
  // Hidden entirely until a Gemini key is configured.
  if (!(await assistantAvailable())) notFound();
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
