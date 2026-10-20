const STYLES: Record<string, [string, string]> = {
  pending: ["قيد المراجعة", "bg-warning/10 text-warning"],
  changes_requested: ["مطلوب تعديل", "bg-danger/10 text-danger"],
  published: ["منشور", "bg-success/10 text-success"],
  hidden: ["مخفي", "bg-sand text-muted"],
  draft: ["مسودة", "bg-sand text-muted"],
};

/** What the supplier needs to know about a product, in one chip. */
export function ProductStatusChip({ status, review }: { status: string; review: string | null }) {
  const key = status === "published" ? "published" : review === "changes_requested" ? "changes_requested" : review === "pending" ? "pending" : status;
  const [label, cls] = STYLES[key] ?? STYLES.draft;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${cls}`}>{label}</span>;
}
