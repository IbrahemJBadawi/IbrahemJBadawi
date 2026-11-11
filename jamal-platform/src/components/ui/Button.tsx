import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-out active:scale-[0.98] focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-ivory shadow-[0_8px_20px_-12px_rgba(29,27,24,0.8)] hover:bg-ink-soft hover:shadow-[0_12px_26px_-14px_rgba(29,27,24,0.8)]",
  secondary: "border border-line bg-paper text-ink shadow-sm hover:border-beige hover:bg-sand",
  outline: "border border-ink/50 bg-paper/50 text-ink hover:border-ink hover:bg-ink hover:text-ivory",
  ghost: "text-ink hover:bg-sand",
  danger: "bg-danger text-white hover:bg-danger/90",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
