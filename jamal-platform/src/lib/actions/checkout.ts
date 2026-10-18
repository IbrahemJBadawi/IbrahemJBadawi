"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { cartSchema, checkoutSchema, placeOrder, quoteCart, type Quote } from "@/lib/orders/service";

export async function quoteAction(items: unknown, country: string | null, governorateId: string | null = null): Promise<Quote | null> {
  const parsed = cartSchema.safeParse(items);
  if (!parsed.success) return null;
  const c = country && /^[A-Z]{2}$/.test(country) ? country : null;
  const g = governorateId && z.uuid().safeParse(governorateId).success ? governorateId : null;
  return quoteCart(parsed.data, c, g);
}

export type CheckoutState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  orderNumber?: string;
  accessToken?: string;
  values?: Record<string, string>;
};

const FIELDS = ["customerName", "phone", "country", "governorateId", "city", "address", "notes", "paymentMethod", "idempotencyKey"];

export async function placeOrderAction(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const values = Object.fromEntries(FIELDS.map((k) => [k, String(form.get(k) ?? "")]));
  if (!(await rateLimit("order", 8, 10 * 60_000))) {
    return { ok: false, error: "عدد كبير من المحاولات. حاول مرة أخرى بعد قليل.", values };
  }
  let items: unknown;
  try {
    items = JSON.parse(String(form.get("items") ?? "[]"));
  } catch {
    items = [];
  }
  const parsed = checkoutSchema.safeParse({ ...values, items, acceptTerms: form.get("acceptTerms") === "on" });
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
  let result;
  try {
    result = await placeOrder(parsed.data, user?.id ?? null);
  } catch (e) {
    console.error("placeOrder failed", e);
    // The whole order is one transaction: on failure nothing was saved.
    // Retrying is safe — the idempotency key prevents duplicates.
    return { ok: false, error: "تعذّر حفظ الطلب بسبب خطأ مؤقت، ولم يُسجَّل أي طلب. أعد المحاولة — لن يتكرر الطلب.", values };
  }
  if (!result.ok) return { ok: false, error: result.error, values };

  // Lets the confirmation page show this order to a guest, briefly.
  (await cookies()).set("jamal_last_order", result.orderId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return { ok: true, orderNumber: result.orderNumber, accessToken: result.accessToken };
}
