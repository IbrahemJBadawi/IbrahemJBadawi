import Image from "next/image";

/**
 * Official Halaqati mark (the «ح» with arch and open book), used unaltered.
 * The original artwork is kept at /public/brand/halaqati-logo-original.png;
 * the halaqati-mark-* files are proportionally scaled copies with the empty
 * margin trimmed, for fast loading.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  const file = size <= 64 ? 128 : size <= 128 ? 256 : 512;
  return (
    <Image
      src={`/brand/halaqati-mark-${file}.png`}
      alt="شعار حلقتي"
      width={size}
      height={size}
      unoptimized
      priority
      className="rounded-lg"
    />
  );
}

export function Logo({ withTagline = false }: { withTagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-bold text-brand-800">حلقتي</span>
        {withTagline && <span className="text-xs text-gold-dark">رحلتك مع القرآن</span>}
      </span>
    </span>
  );
}
