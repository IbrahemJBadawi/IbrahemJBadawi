import Image from "next/image";

export function Logo({ size = 36, withText = true, sub }: { size?: number; withText?: boolean; sub?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image src="/brand/mark-96.png" alt="" width={size} height={size} priority className="shrink-0" />
      {withText && (
        <span className="wordmark leading-tight">
          <span className="block font-extrabold text-ink">TechMood <span className="grad-text">Growth</span></span>
          {sub && <small className="block text-[0.72rem] font-semibold text-muted">{sub}</small>}
        </span>
      )}
    </span>
  );
}
