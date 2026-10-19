import type { VentureStatus } from "@/data/ventures";
import type { Locale } from "@/i18n/config";
import { statusLabel } from "@/lib/status";

export function StatusBadge({ status, locale }: { status: VentureStatus; locale: Locale }) {
  return <span className={`status status-${status}`}>{statusLabel(status, locale)}</span>;
}
