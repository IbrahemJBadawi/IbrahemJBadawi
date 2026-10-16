"use client";

import { useEffect, useState } from "react";

const EARLY_MS = 10 * 60 * 1000;

/** Shows the meeting link from 10 minutes before start until the session ends. */
export function JoinMeetingButton({ url, startsAt, durationMinutes }: { url: string | null; startsAt: string; durationMinutes: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  if (!url || now === null) return null;
  const start = new Date(startsAt).getTime();
  const end = start + durationMinutes * 60_000;
  if (now > end) return null;
  if (now < start - EARLY_MS) {
    return <p className="mt-2 text-sm text-muted">يظهر زر الانضمام قبل الموعد بعشر دقائق.</p>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-fill px-4 font-semibold text-white hover:brightness-110">
      انضم إلى اللقاء الآن
    </a>
  );
}
