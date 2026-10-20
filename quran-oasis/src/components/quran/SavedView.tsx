"use client";

import { Bookmark, BookOpen, Heart, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { formatCitation, getSurahMeta, toArabicDigits } from "@/lib/quran";
import { setBookmark, setFavoriteNote, toggleFavorite } from "@/lib/store/actions";
import { useHydrated, useStore } from "@/lib/store/store";
import type { Bookmark as BookmarkT } from "@/lib/store/types";
import { QuranPassage } from "./QuranPassage";

function FavoriteItem({ b }: { b: BookmarkT }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(b.note ?? "");
  return (
    <li className="py-5">
      <QuranPassage refs={[{ surah: b.surah, from: b.ayah, to: b.ayah }]} showCitation={false} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted">
          سورة {getSurahMeta(b.surah)?.name} {formatCitation(b.surah, b.ayah)}
        </p>
        <div className="flex items-center gap-1">
          <Link href={`/quran/${b.surah}?ayah=${b.ayah}`} className="rounded-full p-2 text-muted hover:bg-surface-2 focus-ring" aria-label="فتح في المصحف">
            <BookOpen className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => setEditing((e) => !e)} className="rounded-full p-2 text-muted hover:bg-surface-2 focus-ring" aria-label="إضافة ملاحظة">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              toggleFavorite(b.surah, b.ayah);
              toast("أُزيلت من المفضلة");
            }}
            className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-danger focus-ring"
            aria-label="إزالة من المفضلة"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea aria-label="ملاحظتي على الآية" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظتك الخاصة (لا تُعرض على أحد)" />
          <Button
            size="sm"
            onClick={() => {
              setFavoriteNote(b.surah, b.ayah, note);
              setEditing(false);
              toast("حُفظت الملاحظة");
            }}
          >
            حفظ الملاحظة
          </Button>
        </div>
      ) : (
        b.note && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm">{b.note}</p>
      )}
    </li>
  );
}

export function SavedView() {
  const hydrated = useHydrated();
  const bookmarks = useStore((s) => s.bookmarks);
  const toast = useToast();
  const favorites = useMemo(
    () => Object.values(bookmarks).filter((b) => b.kind === "favorite" && !b.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [bookmarks],
  );
  const mark = bookmarks["bookmark"] && !bookmarks["bookmark"].deleted ? bookmarks["bookmark"] : null;

  if (!hydrated) return <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card>
        <CardTitle icon={<Bookmark className="h-5 w-5" />}>العلامة المرجعية</CardTitle>
        {mark ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold">
              سورة {getSurahMeta(mark.surah)?.name} · الآية {toArabicDigits(mark.ayah)}
            </p>
            <div className="flex gap-2">
              <ButtonLink href={`/quran/${mark.surah}?ayah=${mark.ayah}`} size="sm">
                الانتقال إليها
              </ButtonLink>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setBookmark(mark.surah, mark.ayah);
                  toast("أُزيلت العلامة");
                }}
              >
                إزالة
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">اضغط على أي آية في المصحف ثم اختر «علامة» لتضع علامتك المرجعية.</p>
        )}
      </Card>
      <Card>
        <CardTitle icon={<Heart className="h-5 w-5" />}>الآيات المفضلة ({toArabicDigits(favorites.length)})</CardTitle>
        {favorites.length ? (
          <ul className="divide-y divide-line">
            {favorites.map((b) => (
              <FavoriteItem key={b.id} b={b} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Heart className="h-6 w-6" />} title="لا توجد آيات مفضلة بعد">
            اضغط على أي آية أثناء القراءة واختر «المفضلة».
          </EmptyState>
        )}
      </Card>
    </div>
  );
}
