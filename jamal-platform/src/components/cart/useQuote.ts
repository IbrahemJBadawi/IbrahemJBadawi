"use client";

import { useEffect, useState } from "react";
import { quoteAction } from "@/lib/actions/checkout";
import type { Quote } from "@/lib/orders/service";
import type { CartLine } from "./cart-store";

/** Server-computed quote for the current cart (prices never come from the client). */
export function useQuote(lines: CartLine[], country: string | null) {
  const [state, setState] = useState<{ key: string; quote: Quote | null; error: boolean } | null>(null);
  const key = JSON.stringify([lines, country]);

  useEffect(() => {
    if (!lines.length) return;
    let cancelled = false;
    quoteAction(lines, country)
      .then((quote) => !cancelled && setState({ key, quote, error: false }))
      .catch(() => !cancelled && setState({ key, quote: null, error: true }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state?.key === key ? state : null;
  return { quote: current?.quote ?? null, loading: lines.length > 0 && !current, error: current?.error ?? false };
}
