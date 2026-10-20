import type { ReactNode } from "react";

export function Prose({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">{title}</h1>
      {updated && <p className="mt-2 text-sm text-muted">آخر تحديث: {updated}</p>}
      <div className="mt-8 space-y-5 text-[16px] leading-loose text-fg [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mr-5 [&_li]:list-disc [&_a]:text-accent [&_a]:underline">
        {children}
      </div>
    </article>
  );
}
