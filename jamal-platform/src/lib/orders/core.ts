/**
 * Order placement core (framework-free, runs inside a transaction).
 * Prices, delivery fees and totals are always recomputed from the database.
 */
import { randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import type { Tx } from "@/lib/db/core";
import { fromMills, toMills } from "@/lib/money";
import {
  computeQuote,
  deliveryEstimate,
  effectiveUnitPrice,
  isCodAvailable,
  PricingError,
  type Zone,
} from "@/lib/pricing";

export const cartItemSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable(),
  quantity: z.number().int().min(1).max(20),
});
export const cartSchema = z.array(cartItemSchema).min(1).max(30);
export type CartItem = z.infer<typeof cartItemSchema>;

export const checkoutSchema = z.object({
  items: cartSchema,
  customerName: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, "رقم الهاتف غير صالح"),
  country: z.string().length(2, "اختر الدولة"),
  governorateId: z.union([z.literal(""), z.uuid()]).optional(),
  city: z.string().trim().min(2, "المدينة مطلوبة").max(60),
  address: z.string().trim().min(5, "العنوان قصير جدًا").max(300),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["bank_transfer", "cod"], { message: "اختر طريقة الدفع" }),
  // Generated once per checkout page: retries/double clicks return the same order.
  idempotencyKey: z.uuid("انتهت صلاحية النموذج، حدّث الصفحة"),
  acceptTerms: z.literal(true, { message: "يجب الموافقة على الشروط والسياسات" }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type QuoteLine = {
  key: string;
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  image: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  currency: string;
  isDemo: boolean;
  problem: string | null;
};

type LoadedLine = QuoteLine & {
  overrides: Record<string, { min: number; max: number }>;
  supplier: {
    id: string;
    sku: string | null;
    url: string | null;
    cost: string;
    shippingCost: string;
    currency: string;
    codCountries: string[];
    shipsTo: string[];
  } | null;
};

async function loadLines(tx: Tx, items: CartItem[]): Promise<LoadedLine[]> {
  const lines: LoadedLine[] = [];
  for (const item of items) {
    const [row] = await tx.query<{
      id: string; slug: string; name_ar: string; price: string; sale_price: string | null;
      currency_code: string; availability: string; status: string; is_demo: boolean; image: string | null;
      delivery_overrides: Record<string, { min: number; max: number }>; variant_count: number;
      v_id: string | null; color_name: string | null; size: string | null; sku: string | null;
      price_override: string | null; v_availability: string | null;
    }>(
      `select p.id, p.slug, p.name_ar, p.price::text, p.sale_price::text, p.currency_code, p.availability,
              p.status, p.is_demo, p.images->0->>'url' as image, p.delivery_overrides,
              (select count(*)::int from public.product_variants x where x.product_id = p.id) as variant_count,
              v.id as v_id, v.color_name, v.size, v.sku, v.price_override::text, v.availability as v_availability
       from public.products p
       left join public.product_variants v on v.id = $2 and v.product_id = p.id
       where p.id = $1`,
      [item.productId, item.variantId],
    );
    const key = `${item.productId}:${item.variantId ?? ""}`;
    if (!row || row.status !== "published") {
      lines.push({
        key, productId: item.productId, variantId: item.variantId, slug: "", name: "منتج غير متاح",
        variantLabel: null, sku: null, image: null, unitPrice: "0", quantity: item.quantity, lineTotal: "0",
        currency: "", isDemo: false, problem: "لم يعد هذا المنتج متاحًا.", overrides: {}, supplier: null,
      });
      continue;
    }
    let problem: string | null = null;
    if (row.availability !== "available") problem = "المنتج غير متوفر حاليًا.";
    else if (row.variant_count > 0 && !row.v_id) problem = "يرجى اختيار المقاس/اللون.";
    else if (item.variantId && !row.v_id) problem = "الخيار المحدد غير موجود.";
    else if (row.v_id && row.v_availability !== "available") problem = "هذا الخيار غير متوفر حاليًا.";

    const unit = effectiveUnitPrice({
      price: row.price,
      salePrice: row.sale_price,
      variantPriceOverride: row.price_override,
    });
    const [sp] = await tx.query<{
      supplier_id: string; supplier_sku: string | null; supplier_url: string | null; cost: string;
      shipping_cost: string; currency_code: string; cod_countries: string[]; ships_to: string[];
    }>(
      `select sp.supplier_id, sp.supplier_sku, sp.supplier_url, sp.cost::text, sp.shipping_cost::text,
              sp.currency_code, s.cod_countries, s.ships_to
       from public.supplier_products sp join public.suppliers s on s.id = sp.supplier_id and s.is_active
       where sp.product_id = $1 and sp.is_primary and (sp.variant_id = $2 or sp.variant_id is null)
       order by (sp.variant_id is null) limit 1`,
      [row.id, row.v_id],
    );
    lines.push({
      key,
      productId: row.id,
      variantId: row.v_id,
      slug: row.slug,
      name: row.name_ar,
      variantLabel: [row.color_name, row.size].filter(Boolean).join(" / ") || null,
      sku: row.sku,
      image: row.image,
      unitPrice: unit,
      quantity: item.quantity,
      lineTotal: fromMills(toMills(unit) * item.quantity),
      currency: row.currency_code,
      isDemo: row.is_demo,
      problem,
      overrides: row.delivery_overrides ?? {},
      supplier: sp
        ? {
            id: sp.supplier_id, sku: sp.supplier_sku, url: sp.supplier_url, cost: sp.cost,
            shippingCost: sp.shipping_cost, currency: sp.currency_code,
            codCountries: sp.cod_countries ?? [], shipsTo: sp.ships_to ?? [],
          }
        : null,
    });
  }
  return lines;
}

type ZoneRow = {
  id: string; country_code: string; currency_code: string; rate: string; estimated_cost: string | null;
  free_shipping_threshold: string | null; min_days: number; max_days: number; cod_available: boolean;
  governorate_id: string | null; governorate_name: string | null;
};

/** Delivery zone for an area: exact governorate first, then a country-wide zone. */
async function findZone(tx: Tx, country: string, currency: string, governorateId: string | null) {
  const rows = await tx.query<ZoneRow>(
    `select z.id, z.country_code, z.currency_code, z.rate::text, z.estimated_cost::text, z.free_shipping_threshold::text,
            z.min_days, z.max_days, z.cod_available, z.governorate_id, g.name_ar as governorate_name
     from public.shipping_zones z join public.countries c on c.code = z.country_code
     left join public.governorates g on g.id = z.governorate_id
     where z.country_code = $1 and z.currency_code = $2 and z.is_active and c.is_active
       and (z.governorate_id = $3 or z.governorate_id is null)
     order by (z.governorate_id is null)`,
    [country, currency, governorateId],
  );
  return rows[0] ?? null;
}

async function countryNeedsGovernorate(tx: Tx, country: string) {
  const r = await tx.query("select 1 from public.shipping_zones where country_code = $1 and is_active and governorate_id is not null limit 1", [country]);
  return r.length > 0;
}

const toZone = (z: ZoneRow): Zone => ({
  rate: z.rate,
  freeShippingThreshold: z.free_shipping_threshold,
  currency: z.currency_code,
  codAvailable: z.cod_available,
});

export type Quote = {
  lines: QuoteLine[];
  ok: boolean;
  error: string | null;
  currency: string | null;
  subtotal: string;
  shipping: string | null;
  total: string;
  country: string | null;
  governorateId: string | null;
  estimate: { min: number; max: number } | null;
  paymentMethods: { bank_transfer: boolean; cod: boolean };
};

async function buildQuote(tx: Tx, items: CartItem[], country: string | null, governorateId: string | null = null) {
  const lines = await loadLines(tx, items);
  const [settings] = await tx.query<{ cod_enabled: boolean; manual_orders_enabled: boolean }>(
    "select cod_enabled, manual_orders_enabled from public.store_settings where id = 1",
  );
  const publicLines: QuoteLine[] = lines.map(({ overrides: _o, supplier: _s, ...l }) => {
    void _o; void _s;
    return l;
  });
  const base: Quote = {
    lines: publicLines, ok: false, error: null, currency: null, subtotal: "0", shipping: null,
    total: "0", country, governorateId, estimate: null, paymentMethods: { bank_transfer: false, cod: false },
  };
  const blocking = lines.find((l) => l.problem);
  if (blocking) return { quote: { ...base, error: "بعض المنتجات في السلة تحتاج إلى مراجعة." }, lines, zone: null };

  let zone: ZoneRow | null = null;
  try {
    const currency = lines[0]?.currency;
    if (country && currency) {
      if (!governorateId && (await countryNeedsGovernorate(tx, country))) throw new PricingError("اختر المحافظة لحساب رسوم التوصيل.");
      zone = await findZone(tx, country, currency, governorateId);
      if (!zone) throw new PricingError("التوصيل إلى هذه المنطقة غير متاح حاليًا.");
      const blocked = lines.find((l) => l.supplier && l.supplier.shipsTo.length > 0 && !l.supplier.shipsTo.includes(country));
      if (blocked) throw new PricingError(`المنتج «${blocked.name}» لا يُشحن إلى هذه الدولة حاليًا.`);
    }
    const q = computeQuote(lines, zone ? toZone(zone) : null);
    const cod = !!country && isCodAvailable({
      storeCodEnabled: settings.cod_enabled,
      zone: zone ? toZone(zone) : null,
      country,
      supplierCodCountries: lines.map((l) => (l.supplier ? l.supplier.codCountries : null)),
    });
    return {
      quote: {
        ...base,
        ok: true,
        currency: q.currency,
        subtotal: fromMills(q.subtotalMills),
        shipping: zone ? fromMills(q.shippingMills) : null,
        total: fromMills(q.totalMills),
        estimate: zone
          ? deliveryEstimate({ minDays: zone.min_days, maxDays: zone.max_days }, lines.map((l) => l.overrides[country!]))
          : null,
        paymentMethods: { bank_transfer: settings.manual_orders_enabled, cod },
      } satisfies Quote,
      lines,
      zone,
    };
  } catch (e) {
    if (e instanceof PricingError) {
      // Still show a subtotal when possible so the cart remains useful.
      let subtotal = "0";
      let currency: string | null = null;
      try {
        const q = computeQuote(lines, null);
        subtotal = fromMills(q.subtotalMills);
        currency = q.currency;
      } catch { /* mixed currencies */ }
      return { quote: { ...base, error: e.message, subtotal, total: subtotal, currency }, lines, zone: null };
    }
    throw e;
  }
}

export async function quoteTx(tx: Tx, items: CartItem[], country: string | null, governorateId: string | null): Promise<Quote> {
  return (await buildQuote(tx, items, country, governorateId)).quote;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  let r = "";
  for (let i = 0; i < 6; i++) r += ALPHABET[randomInt(ALPHABET.length)];
  return `JM${ymd}-${r}`;
}

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string; accessToken: string; duplicate?: boolean }
  | { ok: false; error: string };

/**
 * Create an order. Everything that matters (prices, shipping, totals,
 * allowed payment methods) is recomputed here from the database.
 */
export async function placeOrderTx(tx: Tx, input: CheckoutInput, userId: string | null): Promise<PlaceOrderResult> {
  {
    // Idempotency: the same checkout submitted twice returns the first order.
    const [existing] = await tx.query<{ id: string; order_number: string; access_token: string }>(
      "select id, order_number, access_token from public.orders where idempotency_key = $1",
      [input.idempotencyKey],
    );
    if (existing) return { ok: true, orderId: existing.id, orderNumber: existing.order_number, accessToken: existing.access_token, duplicate: true };

    const governorateId = input.governorateId || null;
    const { quote, lines, zone } = await buildQuote(tx, input.items, input.country, governorateId);
    if (!quote.ok || !zone || !quote.currency) return { ok: false, error: quote.error ?? "تعذّر حساب الطلب." };
    if (!quote.paymentMethods[input.paymentMethod]) {
      return { ok: false, error: "طريقة الدفع المختارة غير متاحة لهذه المنطقة أو المنتجات." };
    }
    const accessToken = randomBytes(24).toString("base64url");

    const number = orderNumber();
    const isTest = lines.some((l) => l.isDemo);
    const [order] = await tx.query<{ id: string }>(
      `insert into public.orders (order_number, user_id, customer_name, customer_phone,
         country_code, city, address_line, customer_notes, currency_code, subtotal, shipping_cost, total,
         payment_method, shipping_zone_id, estimated_min_days, estimated_max_days, terms_accepted_at, is_test,
         governorate_id, governorate_name, idempotency_key, access_token, expected_shipping_cost, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now(), $17, $18, $19, $20, $21, $22, 'new')
       returning id`,
      [
        number, userId, input.customerName, input.phone, input.country, input.city,
        input.address, input.notes || null, quote.currency, quote.subtotal, quote.shipping ?? "0", quote.total,
        input.paymentMethod, zone.id, quote.estimate?.min ?? null, quote.estimate?.max ?? null, isTest,
        zone.governorate_id, zone.governorate_name, input.idempotencyKey, accessToken, zone.estimated_cost,
      ],
    );

    // One fulfillment record per supplier (null = not linked to a supplier yet).
    const fulfillmentBySupplier = new Map<string, string>();
    for (const l of lines) {
      const key = l.supplier?.id ?? "none";
      if (fulfillmentBySupplier.has(key)) continue;
      const group = lines.filter((x) => (x.supplier?.id ?? "none") === key);
      const currencies = new Set(group.map((x) => x.supplier?.currency).filter(Boolean));
      const expected =
        l.supplier && currencies.size === 1
          ? fromMills(group.reduce((s, x) => s + (toMills(x.supplier!.cost) + toMills(x.supplier!.shippingCost)) * x.quantity, 0))
          : null;
      const [f] = await tx.query<{ id: string }>(
        `insert into public.fulfillment_records (order_id, supplier_id, cost_currency, expected_cost)
         values ($1, $2, $3, $4) returning id`,
        [order.id, l.supplier?.id ?? null, currencies.size === 1 ? [...currencies][0] : null, expected],
      );
      fulfillmentBySupplier.set(key, f.id);
    }

    for (const l of lines) {
      const [item] = await tx.query<{ id: string }>(
        `insert into public.order_items (order_id, product_id, variant_id, product_name, product_slug,
           variant_label, sku, image_url, unit_price, quantity, line_total)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
        [order.id, l.productId, l.variantId, l.name, l.slug, l.variantLabel, l.sku, l.image, l.unitPrice, l.quantity, l.lineTotal],
      );
      await tx.query(
        `insert into public.order_item_costs (order_item_id, fulfillment_id, supplier_id, supplier_sku,
           supplier_url, unit_cost, unit_shipping_cost, cost_currency)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          item.id, fulfillmentBySupplier.get(l.supplier?.id ?? "none"), l.supplier?.id ?? null,
          l.supplier?.sku ?? null, l.supplier?.url ?? null, l.supplier?.cost ?? null,
          l.supplier?.shippingCost ?? null, l.supplier?.currency ?? null,
        ],
      );
    }

    await tx.query(
      `insert into public.order_events (order_id, status, note, visible_to_customer, actor_id)
       values ($1, 'new', 'تم استلام طلبك. سنتأكد من توفر المنتجات لدى المورد ونعتمد السعر النهائي قبل طلب أي دفعة.', true, $2)`,
      [order.id, userId],
    );
    return { ok: true, orderId: order.id, orderNumber: number, accessToken };
  }
}
