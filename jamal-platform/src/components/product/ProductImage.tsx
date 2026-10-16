import Image from "next/image";

/** Product image with an on-brand fallback when no photo exists yet. */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={`absolute inset-0 flex flex-col items-center justify-center bg-sand ${className}`} role="img" aria-label={alt}>
        <Image src="/brand/jamal-j-outline.png" alt="" width={441} height={600} className="w-1/5 opacity-30" />
        <span className="mt-2 text-xs text-muted">لا توجد صورة بعد</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
