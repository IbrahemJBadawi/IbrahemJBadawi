import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({ variant = "primary", size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: "sm" }) {
  return <button className={cx("btn", `btn-${variant}`, size === "sm" && "btn-sm", className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: "sm" }) {
  return <Link className={cx("btn", `btn-${variant}`, size === "sm" && "btn-sm", className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("surface p-4 sm:p-5", className)} {...props} />;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export type Tone = "blue" | "sky" | "green" | "amber" | "violet" | "pink" | "gray" | "red";

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("badge", `tone-${tone}`, className)}>{children}</span>;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warning"; children: ReactNode }) {
  const t = { info: "tone-blue", success: "tone-green", error: "tone-red", warning: "tone-amber" }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-[16px] px-4 py-3 text-[0.95rem] font-medium", t)}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children, icon, action }: { title: string; children?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[22px] border border-dashed border-line bg-panel/70 px-5 py-10 text-center">
      {icon && <div className="mb-3 grid h-14 w-14 place-items-center rounded-full tone-blue">{icon}</div>}
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="mt-1 max-w-md text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Tile({ tone, icon, label, value, hint, href }: { tone: Tone; icon?: ReactNode; label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      {icon && <span className="tile-icon">{icon}</span>}
      <span className="tile-value num">{value}</span>
      <span className="tile-label">{label}</span>
      {hint && <span className="tile-hint">{hint}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={cx("tile", `tone-${tone}`)}>
      {body}
    </Link>
  ) : (
    <div className={cx("tile", `tone-${tone}`)}>{body}</div>
  );
}

export function Field({ label, name, error, hint, children, optional }: { label: string; name: string; error?: string; hint?: ReactNode; children: ReactNode; optional?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[0.92rem] font-bold">
        {label} {optional && <span className="text-xs font-medium text-faint">(اختياري)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input id={props.id ?? props.name} className={cx("input", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea id={props.id ?? props.name} className={cx("input", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select id={props.id ?? props.name} className={cx("input", className)} {...props} />;
}

export function Checkbox({ label, name, defaultChecked, hint }: { label: ReactNode; name: string; defaultChecked?: boolean; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-deep px-3 py-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="check mt-0.5" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Chips({ items }: { items: { href: string; label: string; on: boolean; count?: number }[] }) {
  return (
    <nav className="chips" aria-label="تصفية">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={cx("chip", i.on && "is-on")} aria-current={i.on ? "page" : undefined}>
          {i.label}
          {i.count != null && <span className="chip-count num">{i.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="التنقل بين الصفحات" className="mt-5 flex items-center justify-center gap-3">
      {page > 1 ? <ButtonLink variant="secondary" size="sm" href={hrefFor(page - 1)}>السابق</ButtonLink> : <span />}
      <span className="text-sm text-muted">
        صفحة <span className="num">{page}</span> من <span className="num">{pages}</span>
      </span>
      {page < pages ? <ButtonLink variant="secondary" size="sm" href={hrefFor(page + 1)}>التالي</ButtonLink> : <span />}
    </nav>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("");
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {letters || "؟"}
    </span>
  );
}

/** Horizontal bars with numbers; every chart doubles as a readable list. */
export function BarList({ rows, empty = "لا توجد بيانات في هذه الفترة." }: { rows: { label: string; value: number; hint?: string }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0 || rows.every((r) => r.value === 0)) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">{r.label}</span>
            <span className="num text-muted">
              {r.value.toLocaleString("ar")}
              {r.hint && <span className="ms-2 text-xs">{r.hint}</span>}
            </span>
          </div>
          <div className="hbar-track" aria-hidden>
            <div className="hbar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ColumnChart({ points, label }: { points: { label: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <figure>
      <div className="bars" role="img" aria-label={label}>
        {points.map((p, i) => (
          <div
            key={i}
            className={cx("bar", p.value === 0 && "is-zero")}
            style={{ height: `${Math.max(4, (p.value / max) * 100)}%` }}
            title={`${p.label}: ${p.value}`}
          />
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-xs text-faint">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}
