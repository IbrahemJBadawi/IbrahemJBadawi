import type { ReactNode } from "react";

const tones = {
  neutral: "bg-sand text-ink-soft",
  dark: "bg-ink text-ivory",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  outline: "border border-line text-muted",
} as const;

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
