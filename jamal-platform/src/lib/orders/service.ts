import "server-only";
import { asSystem } from "@/lib/db";
import { placeOrderTx, quoteTx, type CartItem, type CheckoutInput, type PlaceOrderResult, type Quote } from "./core";

export * from "./core";

export function quoteCart(items: CartItem[], country: string | null, governorateId: string | null = null): Promise<Quote> {
  return asSystem((tx) => quoteTx(tx, items, country, governorateId));
}

export function placeOrder(input: CheckoutInput, userId: string | null): Promise<PlaceOrderResult> {
  return asSystem((tx) => placeOrderTx(tx, input, userId));
}
