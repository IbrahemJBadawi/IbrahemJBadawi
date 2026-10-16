"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { cartSchema, checkoutSchema, placeOrder, quoteCart, type Quote } from "@/lib/orders/service";

export async function quoteAction(items: unknown, country: string | null): Promise<Quote | null> {
  const parsed = cartSchema.safeParse(items);
  if (!parsed.success) return null;
  const c = country && /^[A-Z]{2}$/.test(country) ? country : null;
  return quoteCart(parsed.data, c);
}

export type CheckoutState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  orderNumber?: string;
  values?: Record<string, string>;
};

export async function placeOrderAction(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const values = Object.fromEntries(
    ["customerName", "phone", "email", "country", "city", "address", "notes", "paymentMethod"].map((k) => [k, String(form.get(k) ?? "")]),
  );
  if (!(await rateLimit("order", 5, 10 * 60_000))) {
    return { ok: false, error: "عدد كبير من المحاولات. حاول مرة أخرى بعد قليل.", values };
  }
  let items: unknown;
  try {
    items = JSON.parse(String(form.get("items") ?? "[]"));
  } catch {
    items = [];
  }
  const parsed = checkoutSchema.safeParse({
    ...values,
    items,
    acceptTerms: form.get("acceptTerms") === "on",
  });
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    return {
      ok: false,
      error: flat.fieldErrors.items ? "السلة فارغة أو غير صالحة." : "يرجى مراجعة الحقول المظللة.",
      fieldErrors: flat.fieldErrors,
      values,
    };
  }
  const user = await getCurrentUser();
  const result = await placeOrder(parsed.data, user?.id ?? null);
  if (!result.ok) return { ok: false, error: result.error, values };

  // Lets the confirmation page show this order to a guest, briefly.
  (await cookies()).set("jamal_last_order", result.orderId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return { ok: true, orderNumber: result.orderNumber };
}
