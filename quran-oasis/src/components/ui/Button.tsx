import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "qo-btn inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl font-bold disabled:cursor-not-allowed disabled:opacity-50 focus-ring select-none";
const variants: Record<Variant, string> = {
  primary: "qo-btn-primary bg-primary text-primary-fg hover:brightness-110",
  secondary: "bg-accent-soft text-primary hover:bg-line/70",
  ghost: "text-fg hover:bg-surface-2",
  gold: "bg-gold text-deep hover:brightness-95 shadow-sm",
  danger: "bg-danger text-white hover:opacity-90",
  outline: "border border-line bg-surface/95 text-fg hover:bg-surface-2 hover:border-accent/30",
};
const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
  icon: "h-10 w-10",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
