"use client";

import { useEffect, useState } from "react";
import type { QuranRef } from "@/content/adhkar";
import { formatCitation, getSurahMeta, type Ayah } from "@/lib/quran";
import { loadAyahs } from "@/lib/quran/source";
import { cn } from "@/components/ui/cn";
import { AyahMarker } from "./AyahMarker";

type State = { status: "loading" } | { status: "ready"; parts: { ref: QuranRef; ayahs: Ayah[] }[] } | { status: "error"; message: string };

/**
 * يعرض آيات من النص المعتمد (لا يُكتب القرآن يدويًا في أي مكان من المنصة).
 * إن تعذّر التحميل يعرض رسالة واضحة بدل أي نص بديل.
 */
export function QuranPassage({
  refs,
  className,
  showCitation = true,
  size = "inline",
}: {
  refs: QuranRef[];
  className?: string;
  showCitation?: boolean;
  size?: "inline" | "large";
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const key = JSON.stringify(refs);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    Promise.all(refs.map(async (ref) => ({ ref, ayahs: await loadAyahs(ref.surah, ref.from, ref.to) })))
      .then((parts) => alive && setState({ status: "ready", parts }))
      .catch((e: Error) => alive && setState({ status: "error", message: e.message }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (state.status === "loading") {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true" aria-label="جارٍ تحميل الآيات">
        <div className="h-6 w-full animate-pulse rounded-lg bg-surface-2" />
        <div className="h-6 w-3/4 animate-pulse rounded-lg bg-surface-2" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className={cn("rounded-xl bg-gold-soft p-3 text-sm text-gold-fg", className)}>
        تعذّر عرض النص القرآني الآن: {state.message}
      </p>
    );
  }
  return (
    <div className={cn("space-y-4", className)}>
      {state.parts.map(({ ref, ayahs }) => {
        const s = getSurahMeta(ref.surah);
        const whole = ref.from === 1 && ref.to === s?.ayahs;
        return (
          <figure key={`${ref.surah}:${ref.from}`}>
            <blockquote lang="ar" className={cn(size === "large" ? "quran-text" : "quran-inline", "text-fg")}>
              {ayahs.map((a) => (
                <span key={a.a}>
                  {a.t}
                  <AyahMarker n={a.a} />{" "}
                </span>
              ))}
            </blockquote>
            {showCitation && (
              <figcaption className="mt-1 text-xs font-semibold text-muted">
                {whole ? `سورة ${s?.name}` : formatCitation(ref.surah, ref.from, ref.to)}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
