import type { Dhikr } from "@/content/adhkar";
import { QuranPassage } from "@/components/quran/QuranPassage";
import { cn } from "@/components/ui/cn";

export function DhikrText({ dhikr, compact }: { dhikr: Dhikr; compact?: boolean }) {
  return (
    <div>
      {dhikr.title && <p className="mb-2 text-sm font-bold text-accent">{dhikr.title}</p>}
      {dhikr.quran?.length ? <QuranPassage refs={dhikr.quran} className={compact ? "max-h-48 overflow-hidden" : undefined} /> : null}
      {dhikr.text && (
        <p lang="ar" className={cn("dhikr-text text-fg", compact && "!text-lg")}>
          {dhikr.text}
        </p>
      )}
    </div>
  );
}
