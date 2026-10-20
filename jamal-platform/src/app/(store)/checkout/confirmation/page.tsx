import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asSystem } from "@/lib/db";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "طلبك", robots: { index: false } };

// Auth-gated by a short-lived cookie set when the order is placed.
export const instant = false;

/** Legacy confirmation URL: forwards to the private order page. */
export default async function ConfirmationPage() {
  const id = (await cookies()).get("jamal_last_order")?.value;
  const order = id && /^[0-9a-f-]{36}$/.test(id)
    ? await asSystem(async (tx) => (await tx.query<{ order_number: string; access_token: string }>("select order_number, access_token from public.orders where id = $1", [id]))[0] ?? null)
    : null;
  if (order) redirect(`/order/${order.order_number}?t=${order.access_token}`);
  return (
    <div className="container-page py-16">
      <EmptyState title="لا يوجد طلب حديث لعرضه" description="يمكنك متابعة طلباتك من صفحة «طلباتي» أو «تتبع الطلب»." action={<ButtonLink href="/track">تتبع الطلب</ButtonLink>} />
    </div>
  );
}
