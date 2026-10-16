import Image from "next/image";
import Link from "next/link";

/** Brand lockup: blackletter J monogram + JAMAL wordmark + Arabic name. */
export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" aria-label="منصة الجمال — الصفحة الرئيسية" className={`group inline-flex items-center gap-2 ${className}`} dir="ltr">
      <Image src="/brand/jamal-j.png" alt="" width={441} height={600} priority className="h-9 w-auto md:h-11" />
      <span className="flex flex-col items-start leading-none">
        <span className="font-display text-[1.45rem] font-semibold tracking-[0.32em] text-ink md:text-[1.7rem]">JAMAL</span>
        {!compact && <span className="mt-1 text-[0.6rem] font-medium tracking-[0.18em] text-beige-deep" dir="rtl">منصة الجمال</span>}
      </span>
    </Link>
  );
}

export function Monogram({ variant = "solid", className = "" }: { variant?: "solid" | "outline" | "outline-light"; className?: string }) {
  const src = variant === "solid" ? "/brand/jamal-j.png" : variant === "outline" ? "/brand/jamal-j-outline.png" : "/brand/jamal-j-outline-light.png";
  return <Image src={src} alt="" width={441} height={600} className={`h-auto ${className}`} aria-hidden />;
}
