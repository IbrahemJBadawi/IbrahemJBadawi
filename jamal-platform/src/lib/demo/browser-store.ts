/**
 * Isolated browser-only trial orders.
 * No customer credentials, payment details, or network requests are stored.
 * Clearing site data or switching browsers deletes access to these records.
 */
export type BrowserDemoLine = {
  productId: string;
  name: string;
  variant: string | null;
  quantity: number;
  lineTotal: string;
};

export type BrowserDemoOrder = {
  id: string;
  createdAt: string;
  label: string;
  note: string;
  lines: BrowserDemoLine[];
  currency: string;
  subtotal: string;
  status: "local_demo";
};

const KEY = "jamal_browser_demo_orders_v1";
const MAX_ORDERS = 50;

export function readBrowserDemoOrders(): BrowserDemoOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is BrowserDemoOrder =>
      !!item && typeof item === "object" && typeof item.id === "string" &&
      typeof item.createdAt === "string" && typeof item.label === "string" &&
      typeof item.currency === "string" && typeof item.subtotal === "string" &&
      Array.isArray(item.lines) && item.status === "local_demo",
    ).slice(0, MAX_ORDERS);
  } catch {
    return [];
  }
}

export function writeBrowserDemoOrder(input: Omit<BrowserDemoOrder, "id" | "createdAt" | "status">):
  { ok: true; id: string } | { ok: false; message: string } {
  if (typeof window === "undefined" || !input.lines.length || input.lines.length > 30) {
    return { ok: false, message: "الطلب التجريبي غير صالح." };
  }
  if (!input.lines.every((line) =>
    Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 20 &&
    typeof line.productId === "string" && typeof line.name === "string"
  )) return { ok: false, message: "محتويات السلة غير صالحة." };
  const id = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const record: BrowserDemoOrder = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
    status: "local_demo",
    label: input.label.trim().slice(0, 60) || "طلب تجربة",
    note: input.note.trim().slice(0, 300),
  };
  try {
    const previous = readBrowserDemoOrders();
    window.localStorage.setItem(KEY, JSON.stringify([record, ...previous].slice(0, MAX_ORDERS)));
    return { ok: true, id };
  } catch {
    return { ok: false, message: "تعذّر الحفظ المحلي. تأكد أن متصفحك يسمح بالتخزين وأن المساحة متاحة." };
  }
}

export function removeBrowserDemoOrder(id: string) {
  try {
    const previous = readBrowserDemoOrders();
    window.localStorage.setItem(KEY, JSON.stringify(previous.filter((order) => order.id !== id)));
    return true;
  } catch {
    return false;
  }
}
