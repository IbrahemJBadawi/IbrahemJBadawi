import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5", className)} {...props} />;
}

export function CardTitle({
  icon,
  children,
  action,
  as: Tag = "h2",
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <Tag className="flex items-center gap-2 text-base font-bold text-fg">
        {icon && <span className="text-accent">{icon}</span>}
        {children}
      </Tag>
      {action}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "accent" | "gold" | "success" | "danger" }) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    accent: "bg-accent-soft text-fg",
    gold: "bg-gold-soft text-gold-fg",
    success: "bg-accent-soft text-success",
    danger: "bg-danger/10 text-danger",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}
