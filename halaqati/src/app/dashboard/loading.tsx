export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <div className="h-8 w-48 animate-pulse rounded bg-line" />
      <div className="h-24 animate-pulse rounded-xl bg-white" />
      <div className="h-24 animate-pulse rounded-xl bg-white" />
      <span className="sr-only">جارٍ التحميل…</span>
    </div>
  );
}
