"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Alert, Button } from "./index";
import type { FormState } from "@/lib/validation/common";

export function SubmitButton({ children, pendingText = "جارٍ الحفظ…", ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: FormState | undefined }) {
  if (!state) return null;
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return null;
}
