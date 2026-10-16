import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listMyOrders } from "@/lib/data/orders";
import { formatMoney } from "@/lib/money";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { OrderStatusBadge, formatDate } from "@/components/orders/OrderParts";

export const metadata: Metadata = { title: "طلباتي", robots: { index: false } };

export const instant = false;

export default async function MyOrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await listMyOrders(user);
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">طلباتي</h1>
      {orders.length === 0 ? (
        <EmptyState icon={<Package className="size-10" strokeWidth={1.3} />} title="لا توجد طلبات بعد" action={<ButtonLink href="/products">ابدأ التسوق</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.order_number}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4 hover:border-ink/40">
                <div>
                  <p className="ltr font-mono text-sm font-bold">{o.order_number}</p>
                  <p className="text-xs text-muted">{formatDate(o.created_at)} · {o.item_count} قطعة</p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={o.status} />
                  <span className="text-sm font-bold">{formatMoney(o.total, o.currency_code)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
