import type { ReactNode } from "react";
import { cn } from "./cn";

export function Spinner({ className, label = "جارٍ التحميل" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-muted", className)}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden="true" />
      <span className="text-sm">{label}…</span>
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">{icon}</div>}
      <h3 className="text-base font-bold">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "حدث خطأ", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/5 p-5 text-center">
      <p className="font-bold text-danger">{title}</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 rounded-full bg-surface px-4 py-2 text-sm font-semibold focus-ring">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">{icon}</div>}
        <div>
          <h1 className="text-2xl font-bold leading-snug md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
