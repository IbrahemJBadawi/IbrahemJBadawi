import Image from "next/image";

/** The original TechMood mark (public/brand/logo-mark.png) with the wordmark. */
export function Logo({ size = 38 }: { size?: number }) {
  return (
    <>
      <Image src="/brand/logo-mark.png" alt="" width={size} height={size} priority />
      <span className="brand-text">
        <strong>TechMood</strong>
        <small>TECHNOLOGY</small>
      </span>
    </>
  );
}
