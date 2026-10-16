"use client";

import { BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Form";
import { cn } from "@/components/ui/cn";
import {
  getSurahMeta,
  juzStartRef,
  parseAyahRef,
  searchSurahs,
  SURAHS,
  surahTypeLabel,
  toArabicDigits,
} from "@/lib/quran";
import { useHydrated, useStore } from "@/lib/store/store";

function ContinueCard() {
  const hydrated = useHydrated();
  const last = useStore((s) => s.lastRead);
  if (!hydrated || !last) return null;
  const s = getSurahMeta(last.surah);
  if (!s) return null;
  return (
    <Link
      href={`/quran/${last.surah}?ayah=${last.ayah}`}
      className="mb-6 flex items-center justify-between gap-4 rounded-[var(--radius-card)] bg-deep p-5 text-ivory focus-ring"
    >
      <div>
        <p className="text-sm text-ivory/70">تابع من حيث توقفت</p>
        <p className="mt-0.5 text-lg font-bold">
          سورة {s.name} · الآية {toArabicDigits(last.ayah)}
        </p>
      </div>
      <span className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-5 font-semibold text-deep">
        <BookOpen className="h-5 w-5" aria-hidden="true" />
        متابعة القراءة
      </span>
    </Link>
  );
}

export function SurahBrowser() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"surahs" | "juz">("surahs");
  const results = useMemo(() => searchSurahs(q), [q]);
  const ref = useMemo(() => parseAyahRef(q), [q]);

  return (
    <>
      <ContinueCard />
      <form
        role="search"
        className="mb-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (ref) router.push(`/quran/${ref.surah}?ayah=${ref.ayah}`);
          else if (results.length === 1) router.push(`/quran/${results[0].n}`);
        }}
      >
        <label htmlFor="surah-search" className="sr-only">
          ابحث عن سورة أو انتقل إلى آية
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="surah-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم السورة أو رقمها، أو اكتب مثل: البقرة 255 أو 2:255"
            className="h-13 w-full rounded-2xl border border-line bg-surface pr-12 pl-4 text-[15px] focus-ring"
            autoComplete="off"
          />
        </div>
        {ref && (
          <Link
            href={`/quran/${ref.surah}?ayah=${ref.ayah}`}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-gold-soft px-4 py-2 text-sm font-semibold text-gold-fg focus-ring"
          >
            انتقل إلى سورة {getSurahMeta(ref.surah)?.name} — الآية {toArabicDigits(ref.ayah)}
          </Link>
        )}
      </form>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Segmented
          label="طريقة العرض"
          value={tab}
          onChange={setTab}
          options={[
            { value: "surahs", label: "السور" },
            { value: "juz", label: "الأجزاء" },
          ]}
        />
        {tab === "surahs" && (
          <p className="text-sm text-muted" aria-live="polite">
            {q ? `${results.length} نتيجة` : "١١٤ سورة"}
          </p>
        )}
      </div>

      {tab === "surahs" ? (
        results.length ? (
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((s) => {
              const type = surahTypeLabel(s.type);
              return (
                <li key={s.n}>
                  <Link
                    href={`/quran/${s.n}`}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-accent focus-ring"
                  >
                    <span className="grid h-11 w-11 shrink-0 rotate-45 place-items-center rounded-xl bg-accent-soft">
                      <span className="-rotate-45 text-sm font-bold text-accent">{toArabicDigits(s.n)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-bold">سورة {s.name}</span>
                      <span className="block text-xs text-muted">
                        {[type, `${toArabicDigits(s.ayahs)} آية`, `الصفحة ${toArabicDigits(s.page)}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="hidden text-xs text-muted sm:block" dir="ltr">
                      {s.tr}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="text-center text-muted">لا توجد سورة بهذا الاسم. جرّب كتابة الاسم دون «ال» أو برقم السورة.</Card>
        )
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 30 }, (_, i) => {
            const start = juzStartRef(i + 1);
            const s = getSurahMeta(start.surah)!;
            return (
              <li key={i}>
                <Link
                  href={`/quran/${start.surah}?ayah=${start.ayah}`}
                  className={cn("block rounded-2xl border border-line bg-surface p-4 hover:border-accent focus-ring")}
                >
                  <span className="block font-bold">الجزء {toArabicDigits(i + 1)}</span>
                  <span className="block text-xs text-muted">
                    يبدأ من {s.name} {toArabicDigits(start.ayah)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-8 text-center text-xs text-muted">
        عدد السور {toArabicDigits(SURAHS.length)} · التصنيف المكي والمدني بحسب المصادر المعتمدة لترتيب المصحف
      </p>
    </>
  );
}
