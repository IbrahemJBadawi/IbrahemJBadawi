"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";

export type ActionResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/**
 * Generic form bound to a Server Action returning ActionResult. Shows the
 * pending state, errors (including per-field ones) and success messages.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "حفظ",
  pendingLabel = "جارٍ الحفظ…",
  variant = "primary",
  className = "space-y-5",
  resetOnSuccess = false,
  confirm,
  size = "md",
  fullWidth = false,
}: {
  action: (state: ActionResult, form: FormData) => Promise<ActionResult>;
  children?: ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  const fieldErrors = Object.entries(state.fieldErrors ?? {}).filter(([, v]) => v?.length);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {(state.error || fieldErrors.length > 0) && (
        <Notice tone="error">
          {state.error ?? "يرجى مراجعة البيانات:"}
          {fieldErrors.length > 0 && (
            <ul className="mt-1 list-disc ps-5">
              {fieldErrors.map(([k, v]) => (
                <li key={k}>{v![0]}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}
      {state.ok && state.message && <Notice tone="success">{state.message}</Notice>}
      <Button type="submit" variant={variant} size={size} disabled={pending} className={fullWidth ? "w-full" : ""}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
