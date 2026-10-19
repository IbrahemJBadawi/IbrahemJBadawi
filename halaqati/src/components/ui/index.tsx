import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Variant2 = Variant | "gold";
const VARIANTS: Record<Variant2, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  gold: "btn-gold",
};
const BTN = "btn";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant2 }) {
  return <button className={cx(BTN, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant2 }) {
  return <Link className={cx(BTN, VARIANTS[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("surface p-4 sm:p-5", className)} {...props} />;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-[1.7rem]">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const BADGE_TONES = {
  green: "bg-brand-100 text-brand-900",
  gold: "bg-gold-50 text-gold-dark",
  gray: "bg-deep text-muted",
  red: "bg-danger-50 text-danger",
} as const;

export function Badge({ tone = "gray", children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold", BADGE_TONES[tone])}>{children}</span>;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const styles = {
    info: "border-brand-600/30 bg-brand-50 text-brand-900",
    success: "border-brand-600/30 bg-brand-100 text-brand-900",
    error: "border-danger/30 bg-danger-50 text-danger",
    warning: "border-gold/50 bg-warning-50 text-warning",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-[14px] border px-4 py-3 text-base", styles)}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-line bg-panel/60 px-4 py-10 text-center">
      <p className="text-lg font-semibold text-brand-900">{title}</p>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-2xl font-bold text-ink">{value}</span>
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </Card>
  );
}

const FIELD = "input";

export function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="font-semibold text-ink">{label}</label>
      {children}
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
      {error && <p id={`${name}-error`} className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input id={props.id ?? props.name} className={cx(FIELD, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea id={props.id ?? props.name} className={cx(FIELD, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select id={props.id ?? props.name} className={cx(FIELD, className)} {...props} />;
}

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="التنقل بين الصفحات" className="mt-6 flex items-center justify-center gap-3">
      {page > 1 ? <ButtonLink variant="secondary" href={hrefFor(page - 1)}>السابق</ButtonLink> : <span />}
      <span className="text-muted">صفحة {page} من {pages}</span>
      {page < pages ? <ButtonLink variant="secondary" href={hrefFor(page + 1)}>التالي</ButtonLink> : <span />}
    </nav>
  );
}
