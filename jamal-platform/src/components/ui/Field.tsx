import { cloneElement, isValidElement, useId, type ComponentProps, type ReactElement, type ReactNode } from "react";

export const inputClass =
  "block w-full rounded-[var(--radius-control)] border border-line bg-paper px-3 py-2.5 text-[0.95rem] text-ink placeholder:text-muted/70 focus:border-beige-deep focus:outline-none focus:ring-2 focus:ring-beige/40 disabled:bg-sand/50";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | string[];
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const err = Array.isArray(error) ? error[0] : error;
  const generated = useId();
  // Associate the label with the control even when no id was passed.
  let control = children;
  let id = htmlFor;
  if (!id && isValidElement(children)) {
    const el = children as ReactElement<{ id?: string }>;
    id = el.props.id ?? generated;
    if (!el.props.id) control = cloneElement(el, { id });
  }
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-soft">
        {label}
      </label>
      {control}
      {hint && !err && <p className="text-xs text-muted">{hint}</p>}
      {err && (
        <p className="text-xs font-medium text-danger" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${inputClass} min-h-24 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${inputClass} appearance-auto ${className}`} {...props} />;
}

export function Checkbox({ label, className = "", ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft ${className}`}>
      <input type="checkbox" className="mt-1 size-4 shrink-0 accent-ink" {...props} />
      <span>{label}</span>
    </label>
  );
}
