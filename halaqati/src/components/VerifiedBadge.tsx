export function VerifiedBadge({ verified }: { verified?: boolean | null }) {
  if (!verified) return null;
  return (
    <span title="محفّظ موثّق من إدارة حلقتي" aria-label="موثّق" className="ms-1 inline-flex size-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white align-middle">
      ✓
    </span>
  );
}
