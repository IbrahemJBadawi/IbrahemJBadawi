import Link from "next/link";

export function Pagination({ page, pageCount, basePath, params }: { page: number; pageCount: number; basePath: string; params: Record<string, string | undefined> }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const cls = "inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--radius-card)] border px-3 text-sm";
  return (
    <nav aria-label="الصفحات" className="mt-12 flex items-center justify-center gap-2">
      {page > 1 && <Link className={`${cls} border-line bg-paper`} href={href(page - 1)}>السابق</Link>}
      <span className={`${cls} border-ink bg-ink text-ivory`} aria-current="page">
        {page} / {pageCount}
      </span>
      {page < pageCount && <Link className={`${cls} border-line bg-paper`} href={href(page + 1)}>التالي</Link>}
    </nav>
  );
}
