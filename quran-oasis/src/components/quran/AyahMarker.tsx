import { toArabicDigits } from "@/lib/quran";

/** علامة نهاية الآية مع رقمها، كما في المصحف (U+06DD مع الأرقام العربية). */
export function AyahMarker({ n }: { n: number }) {
  return (
    <span className="ayah-marker" aria-label={`الآية ${n}`}>
      {"۝"}
      {toArabicDigits(n)}
    </span>
  );
}
