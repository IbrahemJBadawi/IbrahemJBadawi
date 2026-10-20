"use client";

import { useEffect, useState } from "react";

/** الوقت الحالي محدَّثًا كل فترة (يعيد null قبل التحميل لتجنّب اختلاف العرض بين الخادم والمتصفح). */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
