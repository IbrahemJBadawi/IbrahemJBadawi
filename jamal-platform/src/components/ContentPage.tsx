import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/States";
import { getPage } from "@/lib/data/catalog";
import { SimpleMarkdown } from "@/components/ui/Markdown";
import { formatDate } from "@/components/orders/OrderParts";

async function PageBody({ slug }: { slug: string }) {
  const page = await getPage(slug);
  if (!page) notFound();
  return (
    <article className="container-page max-w-3xl py-10 md:py-16">
      <h1 className="text-2xl font-bold md:text-3xl">{page.title_ar}</h1>
      <p className="mt-2 text-xs text-muted">آخر تحديث: {formatDate(page.updated_at)}</p>
      <div className="mt-6"><SimpleMarkdown text={page.body_ar} /></div>
    </article>
  );
}

export function ContentPage({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<div className="container-page max-w-3xl space-y-4 py-16"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-40 w-full" /></div>}>
      <PageBody slug={slug} />
    </Suspense>
  );
}
