import Image from "next/image";
import Link from "next/link";

/** Brand lockup: blackletter J monogram + AL JAMAL wordmark + STORE / Arabic name. */
export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" aria-label="متجر الجمال — الصفحة الرئيسية" className={`group inline-flex items-center gap-2 ${className}`} dir="ltr">
      <Image src="/brand/jamal-j.png" alt="" width={441} height={600} priority className="h-9 w-auto md:h-11" />
      <span className="flex flex-col items-start leading-none">
        <span className="font-display text-[1.3rem] font-semibold tracking-[0.22em] text-ink md:text-[1.55rem]">AL JAMAL</span>
        {!compact && <span className="mt-1 text-[0.58rem] font-semibold tracking-[0.42em] text-beige-deep">STORE</span>}
      </span>
    </Link>
  );
}

export function Monogram({ variant = "solid", className = "" }: { variant?: "solid" | "outline" | "outline-light"; className?: string }) {
  const src = variant === "solid" ? "/brand/jamal-j.png" : variant === "outline" ? "/brand/jamal-j-outline.png" : "/brand/jamal-j-outline-light.png";
  return <Image src={src} alt="" width={441} height={600} className={`h-auto ${className}`} aria-hidden />;
}
