import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "سلة التسوق", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-8 md:py-12">
      <h1 className="mb-8 text-2xl font-bold md:text-3xl">سلة التسوق</h1>
      <CartView />
    </div>
  );
}
