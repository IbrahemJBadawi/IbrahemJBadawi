"use client";

import {
  ArrowRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Heart,
  ListChecks,
  Minus,
  Plus,
  Share2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import {
  formatCitation,
  getSurahMeta,
  globalAyahId,
  surahTypeLabel,
  toArabicDigits,
  type SurahMeta,
  type SurahText,
} from "@/lib/quran";
import { SITE } from "@/lib/site";
import {
  logReading,
  logReadingRef,
  saveLastRead,
  setBookmark,
  toggleFavorite,
  updateSettings,
} from "@/lib/store/actions";
import { getState, useStore } from "@/lib/store/store";
import { AyahMarker } from "./AyahMarker";

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.8;

/** الزمن اللازم لاحتساب الآية مقروءة: تقريبًا بحسب طولها (بين 1.2 و12 ثانية). */
function dwellNeeded(text: string) {
  return Math.min(12000, Math.max(1200, text.length * 45));
}

export function Reader({ meta, text, basmala }: { meta: SurahMeta; text: SurahText; basmala: string | null }) {
  const toast = useToast();
  const [selected, setSelected] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const scale = useStore((s) => s.settings.fontScale);
  const focus = useStore((s) => s.settings.focusMode);
  const bookmarks = useStore((s) => s.bookmarks);
  const containerRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  const prev = getSurahMeta(meta.n - 1);
  const next = getSurahMeta(meta.n + 1);
  const type = surahTypeLabel(meta.type);

  const isFavorite = useCallback(
    (a: number) => {
      const b = bookmarks[`fav:${meta.n}:${a}`];
      return !!b && !b.deleted;
    },
    [bookmarks, meta.n],
  );
  const bm = bookmarks["bookmark"];
  const bookmarkAyah = bm && !bm.deleted && bm.surah === meta.n ? bm.ayah : null;

  const scrollToAyah = useCallback((a: number, smooth = true) => {
    const el = document.getElementById(`a-${a}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 140;
    window.scrollTo({ top: Math.max(0, y), behavior: smooth ? "smooth" : "auto" });
    setHighlight(a);
    setTimeout(() => setHighlight((h) => (h === a ? null : h)), 2600);
  }, []);

  // الانتقال إلى آية محددة، أو استعادة آخر موضع في هذه السورة
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const target = Number(new URLSearchParams(window.location.search).get("ayah"));
    if (target >= 1 && target <= meta.ayahs) {
      requestAnimationFrame(() => scrollToAyah(target, false));
      return;
    }
    const last = getState().lastRead;
    if (last && last.surah === meta.n && last.ayah > 1) {
      requestAnimationFrame(() => scrollToAyah(last.ayah, false));
      toast(`عدتَ إلى آخر موضع: الآية ${toArabicDigits(last.ayah)}`, "info");
    }
  }, [meta.n, meta.ayahs, scrollToAyah, toast]);

  // حفظ الموضع تلقائيًا واحتساب الآيات المقروءة فعلًا
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const visibleSince = new Map<number, number>();
    const credited = new Set<number>();
    const pending: number[] = [];
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-ayah]"));
    let topAyah: number | null = null;

    const io = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        for (const e of entries) {
          const a = Number((e.target as HTMLElement).dataset.ayah);
          if (e.isIntersecting) {
            if (!visibleSince.has(a)) visibleSince.set(a, now);
          } else visibleSince.delete(a);
        }
      },
      { rootMargin: "-120px 0px -25% 0px", threshold: 0 },
    );
    nodes.forEach((n) => io.observe(n));

    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const now = performance.now();
      for (const [a, since] of visibleSince) {
        if (credited.has(a)) continue;
        if (now - since >= dwellNeeded(text.ayahs[a - 1].t)) {
          credited.add(a);
          pending.push(a);
        }
      }
      // الموضع الحالي = أول آية تبدأ داخل منطقة القراءة (لا ذيل الآية السابقة في السطر نفسه)
      const visible = [...visibleSince.keys()].sort((x, y) => x - y);
      for (const a of visible) {
        topAyah = a;
        const top = document.getElementById(`a-${a}`)?.getBoundingClientRect().top ?? 0;
        if (top >= 100) break;
      }
      if (topAyah) saveLastRead(meta.n, topAyah);
    }, 1000);

    const flush = setInterval(() => {
      if (!pending.length) return;
      const ids = pending.splice(0).sort((x, y) => x - y);
      let start = ids[0];
      let prevId = ids[0];
      for (let i = 1; i <= ids.length; i++) {
        if (i === ids.length || ids[i] !== prevId + 1) {
          logReading([globalAyahId(meta.n, start), globalAyahId(meta.n, prevId)]);
          start = ids[i];
        }
        prevId = ids[i];
      }
    }, 4000);

    return () => {
      io.disconnect();
      clearInterval(tick);
      clearInterval(flush);
      if (pending.length) {
        const ids = pending.splice(0);
        ids.forEach((a) => logReading([globalAyahId(meta.n, a), globalAyahId(meta.n, a)]));
      }
    };
  }, [meta.n, text.ayahs]);

  // التنقل بلوحة المفاتيح بين الآيات المحددة
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowLeft" && selected < meta.ayahs) {
        e.preventDefault();
        setSelected(selected + 1);
        document.getElementById(`a-${selected + 1}`)?.focus();
      }
      if (e.key === "ArrowRight" && selected > 1) {
        e.preventDefault();
        setSelected(selected - 1);
        document.getElementById(`a-${selected - 1}`)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, meta.ayahs]);

  const setScale = (d: number) => {
    const v = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + d)) * 10) / 10;
    updateSettings({ fontScale: v });
  };

  const shareText = (a: number) => `﴿${text.ayahs[a - 1].t}﴾ ${formatCitation(meta.n, a)}`;

  const copyAyah = async (a: number) => {
    try {
      await navigator.clipboard.writeText(shareText(a));
      toast("نُسخت الآية مع نسبتها إلى السورة ورقمها");
    } catch {
      toast("تعذّر النسخ في هذا المتصفح", "error");
    }
  };

  const shareAyah = async (a: number) => {
    const url = `${SITE.url}/quran/${meta.n}?ayah=${a}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `سورة ${meta.name} — الآية ${a}`, text: shareText(a), url });
      } catch {
        /* أُلغيت المشاركة */
      }
    } else {
      await copyAyah(a);
    }
  };

  // فواصل الصفحات والأجزاء كما في مصحف المدينة
  const pageBreaks = useMemo(() => {
    const set = new Map<number, { page: number; juz?: number }>();
    text.ayahs.forEach((a, i) => {
      const prevA = text.ayahs[i - 1];
      if (i > 0 && prevA.p !== a.p) set.set(a.a, { page: a.p, juz: prevA.j !== a.j ? a.j : undefined });
    });
    return set;
  }, [text.ayahs]);

  return (
    <article className={cn("mx-auto max-w-3xl", focus && "pt-2")} aria-labelledby="surah-title">
      {/* ───────── رأس السورة ───────── */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link href="/quran" className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 focus-ring">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          الفهرس
        </Link>
        <div className="flex items-center gap-1" role="group" aria-label="إعدادات العرض">
          <button type="button" onClick={() => setScale(-0.1)} disabled={scale <= MIN_SCALE} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-40 focus-ring" aria-label="تصغير الخط">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {Math.round(scale * 100)}٪
          </span>
          <button type="button" onClick={() => setScale(0.1)} disabled={scale >= MAX_SCALE} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-40 focus-ring" aria-label="تكبير الخط">
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ focusMode: !focus })}
            aria-pressed={focus}
            className={cn("mr-1 inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold focus-ring", focus ? "bg-primary text-primary-fg" : "hover:bg-surface-2")}
          >
            {focus ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            {focus ? "إنهاء التركيز" : "وضع التركيز"}
          </button>
        </div>
      </div>

      <header className="relative mb-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface px-5 py-6 text-center pattern-bg">
        <h1 id="surah-title" className="text-3xl font-bold text-fg">
          سورة {meta.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {[type, `${toArabicDigits(meta.ayahs)} آية`, `الجزء ${toArabicDigits(meta.juz)}`, `الصفحة ${toArabicDigits(meta.page)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {basmala && (
        <p className="quran-text mb-4 !text-center text-fg" lang="ar" aria-label="البسملة">
          {basmala}
        </p>
      )}

      {/* ───────── نص السورة ───────── */}
      <div ref={containerRef} lang="ar" className="quran-text rounded-[var(--radius-card)] bg-surface px-4 py-6 text-fg sm:px-8">
        {text.ayahs.map((a) => {
          const br = pageBreaks.get(a.a);
          return (
            <Fragment key={a.a}>
              {br && (
                <span className="my-3 flex items-center gap-3 font-sans text-xs font-semibold text-muted" role="separator" aria-label={`الصفحة ${br.page}`}>
                  <span className="h-px flex-1 bg-line" />
                  {br.juz ? `الجزء ${toArabicDigits(br.juz)} · ` : ""}
                  الصفحة {toArabicDigits(br.page)}
                  <span className="h-px flex-1 bg-line" />
                </span>
              )}
              <span
                id={`a-${a.a}`}
                data-ayah={a.a}
                role="button"
                tabIndex={0}
                aria-pressed={selected === a.a}
                onClick={() => setSelected(selected === a.a ? null : a.a)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(selected === a.a ? null : a.a);
                  }
                }}
                className={cn(
                  "cursor-pointer rounded-lg px-0.5 transition-colors [box-decoration-break:clone] focus-visible:outline-2",
                  selected === a.a && "bg-gold-soft",
                  highlight === a.a && selected !== a.a && "bg-accent-soft",
                  bookmarkAyah === a.a && "underline decoration-gold decoration-2 underline-offset-[14px]",
                )}
              >
                {a.t}
                <AyahMarker n={a.a} />
              </span>{" "}
            </Fragment>
          );
        })}
      </div>

      {/* ───────── التنقل بين السور ───────── */}
      <nav aria-label="التنقل بين السور" className="mt-8 grid grid-cols-2 gap-3">
        {prev ? (
          <Link href={`/quran/${prev.n}`} className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-4 hover:border-accent focus-ring">
            <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
            <span>
              <span className="block text-xs text-muted">السورة السابقة</span>
              <span className="font-bold">{prev.name}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/quran/${next.n}`} className="flex items-center justify-end gap-2 rounded-2xl border border-line bg-surface p-4 text-left hover:border-accent focus-ring">
            <span>
              <span className="block text-xs text-muted">السورة التالية</span>
              <span className="font-bold">{next.name}</span>
            </span>
            <ChevronLeft className="h-5 w-5 text-muted" aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <p className="mt-6 text-center text-xs text-muted">
        النص من مصحف المدينة النبوية — مجمع الملك فهد لطباعة المصحف الشريف ·{" "}
        <Link href="/sources" className="underline focus-ring rounded">
          عن المصدر
        </Link>
      </p>

      {/* ───────── خيارات الآية ───────── */}
      {selected !== null && (
        <div
          role="dialog"
          aria-label={`خيارات الآية ${selected}`}
          className="safe-bottom fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-surface shadow-[0_-8px_30px_rgba(0,0,0,.08)] lg:bottom-6 lg:mx-auto lg:max-w-xl lg:rounded-3xl lg:border"
        >
          <div className="flex items-center justify-between px-4 pt-3">
            <p className="text-sm font-bold">
              سورة {meta.name} · الآية {toArabicDigits(selected)}
            </p>
            <button type="button" onClick={() => setSelected(null)} className="rounded-full p-2 hover:bg-surface-2 focus-ring" aria-label="إغلاق الخيارات">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1 px-2 pb-3 pt-1">
            {[
              {
                label: isFavorite(selected) ? "في المفضلة" : "المفضلة",
                icon: Heart,
                active: isFavorite(selected),
                onClick: () => {
                  const was = isFavorite(selected);
                  toggleFavorite(meta.n, selected);
                  toast(was ? "أُزيلت من المفضلة" : "أُضيفت إلى المفضلة");
                },
              },
              {
                label: bookmarkAyah === selected ? "العلامة هنا" : "علامة",
                icon: Bookmark,
                active: bookmarkAyah === selected,
                onClick: () => {
                  const was = bookmarkAyah === selected;
                  setBookmark(meta.n, selected);
                  toast(was ? "أُزيلت العلامة المرجعية" : "وُضعت العلامة المرجعية هنا");
                },
              },
              { label: "نسخ", icon: Copy, onClick: () => copyAyah(selected) },
              { label: "مشاركة", icon: Share2, onClick: () => shareAyah(selected) },
              {
                label: "قرأتُ حتى هنا",
                icon: ListChecks,
                onClick: () => {
                  logReadingRef(meta.n, 1, selected);
                  saveLastRead(meta.n, selected);
                  toast(`سُجّلت قراءة الآيات ١–${toArabicDigits(selected)}`);
                },
              },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.onClick}
                aria-pressed={b.active}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-semibold focus-ring",
                  b.active ? "bg-gold-soft text-gold-fg" : "text-fg hover:bg-surface-2",
                )}
              >
                <b.icon className={cn("h-5 w-5", b.active && "fill-current")} aria-hidden="true" />
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {focus && (
        <button
          type="button"
          onClick={() => updateSettings({ focusMode: false })}
          className="fixed bottom-5 left-5 z-50 inline-flex h-11 items-center gap-2 rounded-full bg-deep px-4 text-sm font-semibold text-ivory shadow-lg focus-ring"
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
          إنهاء وضع التركيز
        </button>
      )}
    </article>
  );
}
