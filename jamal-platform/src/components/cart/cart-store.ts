"use client";

import { useSyncExternalStore } from "react";

/**
 * Client cart (localStorage). It stores only product/variant ids and
 * quantities — prices are always recomputed by the server.
 */
export type CartLine = { productId: string; variantId: string | null; quantity: number };

const KEY = "jamal_cart_v1";
const EVENT = "jamal-cart-change";
const EMPTY: CartLine[] = [];
let cache: { raw: string | null; value: CartLine[] } = { raw: null, value: EMPTY };

function read(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.value;
  let value: CartLine[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      value = parsed
        .filter((l) => l && typeof l.productId === "string" && Number.isInteger(l.quantity))
        .map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, quantity: Math.min(20, Math.max(1, l.quantity)) }))
        .slice(0, 30);
    }
  } catch {
    value = EMPTY;
  }
  cache = { raw, value };
  return value;
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable (private mode) */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

const same = (a: CartLine, productId: string, variantId: string | null) =>
  a.productId === productId && a.variantId === variantId;

export const cart = {
  add(productId: string, variantId: string | null, quantity = 1) {
    const lines = [...read()];
    const i = lines.findIndex((l) => same(l, productId, variantId));
    if (i >= 0) lines[i] = { ...lines[i], quantity: Math.min(20, lines[i].quantity + quantity) };
    else lines.push({ productId, variantId, quantity: Math.min(20, quantity) });
    write(lines.slice(0, 30));
  },
  setQuantity(productId: string, variantId: string | null, quantity: number) {
    write(read().map((l) => (same(l, productId, variantId) ? { ...l, quantity: Math.min(20, Math.max(1, quantity)) } : l)));
  },
  remove(productId: string, variantId: string | null) {
    write(read().filter((l) => !same(l, productId, variantId)));
  },
  clear() {
    write([]);
  },
};

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** True after hydration (server snapshot is always empty). */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
