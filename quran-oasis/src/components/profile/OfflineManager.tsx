"use client";

import { CloudDownload, CloudOff, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Progress";
import { useOnline } from "@/components/layout/OnlineStatus";
import { formatShortDate } from "@/lib/date";

type Status = { surahs: number; ready: boolean; at: string | null };

/** تنزيل المصحف للاستخدام دون اتصال — حالة حقيقية من ذاكرة المتصفح، لا افتراضات. */
export function OfflineManager() {
  const online = useOnline();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback(async (type: string) => {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type });
  }, []);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "caches" in window && process.env.NODE_ENV === "production";
    setSupported(ok);
    if (!ok) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "OFFLINE_STATUS") setStatus({ surahs: d.surahs, ready: d.ready, at: d.at });
      if (d?.type === "DOWNLOAD_PROGRESS") setProgress({ done: d.done, total: d.total, failed: d.failed });
      if (d?.type === "DOWNLOAD_DONE") {
        setProgress(null);
        if (d.failed) setError(`تعذّر تنزيل ${d.failed} عنصرًا. تحقق من الاتصال وأعد المحاولة.`);
        void post("OFFLINE_STATUS");
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    void post("OFFLINE_STATUS");
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [post]);

  if (supported === false) {
    return (
      <p className="text-sm text-muted">
        القراءة دون اتصال غير متاحة في هذا المتصفح أو في وضع التطوير. يحتاج القرآن إلى الإنترنت لتحميل السور، ويُحفظ تقدمك على جهازك في كل الأحوال.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        نزّل نص المصحف كاملًا (نحو ٢ ميغابايت) وصفحات الأقسام الأساسية لتتمكن من القراءة والأذكار دون إنترنت. حسابك ومزامنة التقدم ولوحة الإدارة تحتاج إلى اتصال.
      </p>
      {status && (
        <p className="flex items-center gap-2 text-sm font-semibold">
          {status.ready ? (
            <>
              <CloudOff className="h-4 w-4 text-success" aria-hidden="true" />
              المصحف متاح دون اتصال على هذا الجهاز{status.at ? ` (منذ ${formatShortDate(status.at.slice(0, 10))})` : ""}
            </>
          ) : (
            <>السور المحفوظة على الجهاز: {status.surahs} من ١١٤</>
          )}
        </p>
      )}
      {progress && (
        <div>
          <ProgressBar value={progress.done / progress.total} label="تقدم التنزيل" />
          <p className="mt-1 text-xs text-muted" aria-live="polite">
            جارٍ التنزيل… {progress.done} / {progress.total}
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={status?.ready ? "outline" : "primary"}
          disabled={!online || !!progress}
          onClick={() => {
            setError(null);
            setProgress({ done: 0, total: 1, failed: 0 });
            void post("DOWNLOAD_QURAN");
          }}
        >
          <CloudDownload className="h-5 w-5" aria-hidden="true" />
          {status?.ready ? "تحديث النسخة المحفوظة" : "تنزيل المصحف للقراءة دون اتصال"}
        </Button>
        {status && status.surahs > 0 && !progress && (
          <Button variant="ghost" onClick={() => void post("CLEAR_OFFLINE")}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            حذف النسخة المحفوظة
          </Button>
        )}
      </div>
      {!online && <p className="text-xs text-muted">التنزيل يحتاج إلى اتصال بالإنترنت.</p>}
    </div>
  );
}
