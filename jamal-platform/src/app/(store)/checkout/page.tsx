import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/States";
import { getCurrentUser } from "@/lib/auth";
import { getShippingOptions } from "@/lib/data/catalog";
import { CheckoutForm } from "@/components/cart/CheckoutForm";

export const metadata: Metadata = { title: "إتمام الطلب", robots: { index: false } };

async function Content() {
  const [zones, user] = await Promise.all([getShippingOptions(), getCurrentUser()]);
  return (
      <CheckoutForm
        zones={zones}
        loggedIn={!!user}
        prefill={{ name: user?.fullName ?? "", phone: user?.phone ?? "", email: user?.email ?? "" }}
      />
  );
}

export default function CheckoutPage() {
  return (
    <div className="container-page py-8 md:py-12">
      <h1 className="mb-8 text-2xl font-bold md:text-3xl">إتمام الطلب</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Content />
      </Suspense>
    </div>
  );
}
