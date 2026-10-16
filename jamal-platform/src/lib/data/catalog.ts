import "server-only";
import { cache } from "react";
import { asAnon } from "@/lib/db";

export type ProductImage = { url: string; alt?: string };

export type ProductCard = {
  id: string;
  slug: string;
  name_ar: string;
  price: string;
  sale_price: string | null;
  currency_code: string;
  image: string | null;
  image_alt: string | null;
  availability: "available" | "out_of_stock" | "discontinued";
  is_demo: boolean;
  category_slug: string | null;
  category_name: string | null;
  colors: string[];
};

export type Category = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  product_count: number;
};

export type Variant = {
  id: string;
  color_name: string | null;
  color_hex: string | null;
  size: string | null;
  price_override: string | null;
  availability: "available" | "out_of_stock" | "discontinued";
};

export type ProductDetail = Omit<ProductCard, "image" | "image_alt" | "colors"> & {
  name_en: string | null;
  description_ar: string | null;
  images: ProductImage[];
  origin_country: string | null;
  return_policy: string | null;
  delivery_overrides: Record<string, { min: number; max: number }>;
  variants: Variant[];
  updated_at: string;
};

export type StoreSettings = {
  store_name_ar: string;
  store_name_en: string;
  tagline_ar: string | null;
  announcement_ar: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp: string | null;
  default_currency: string | null;
  cod_enabled: boolean;
  manual_orders_enabled: boolean;
};

export type ShippingOption = {
  id: string;
  country_code: string;
  country_name: string;
  currency_code: string;
  rate: string;
  free_shipping_threshold: string | null;
  min_days: number;
  max_days: number;
  cod_available: boolean;
};

export const SORTS = ["newest", "price_asc", "price_desc", "name"] as const;
export type Sort = (typeof SORTS)[number];

export type ProductFilters = {
  q?: string;
  category?: string;
  onSale?: boolean;
  featured?: boolean;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: Sort;
  page?: number;
  pageSize?: number;
};

const CARD_COLUMNS = `
  p.id, p.slug, p.name_ar, p.price::text, p.sale_price::text, p.currency_code,
  p.images->0->>'url' as image, p.images->0->>'alt' as image_alt,
  p.availability, p.is_demo, c.slug as category_slug, c.name_ar as category_name,
  coalesce((select array_agg(distinct v.color_hex) from public.product_variants v
            where v.product_id = p.id and v.color_hex is not null), '{}') as colors`;

/** Normalise Arabic letter variants (أ/ا, ة/ه, ى/ي…) and strip diacritics so searches match. */
const FROM = "أإآىةؤئ" + "\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0640"; // + harakat & tatweel (deleted)
const TO = "ااايهوي";
const norm = (expr: string) => `translate(lower(${expr}), '${FROM}', '${TO}')`;

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function listProducts(f: ProductFilters = {}) {
  const where: string[] = ["p.status = 'published'"];
  const params: unknown[] = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (f.q && f.q.trim()) {
    const q = add(`%${escapeLike(f.q.trim().slice(0, 80))}%`);
    where.push(`(${norm("p.name_ar")} like ${norm(q)} or lower(coalesce(p.name_en,'')) like lower(${q})
      or ${norm("coalesce(p.description_ar,'')")} like ${norm(q)} or ${norm("coalesce(c.name_ar,'')")} like ${norm(q)})`);
  }
  if (f.category) where.push(`c.slug = ${add(f.category)}`);
  if (f.onSale) where.push("p.sale_price is not null");
  if (f.featured) where.push("p.is_featured");
  if (f.size) where.push(`exists (select 1 from public.product_variants v where v.product_id = p.id and v.size = ${add(f.size)})`);
  if (f.color) where.push(`exists (select 1 from public.product_variants v where v.product_id = p.id and v.color_name = ${add(f.color)})`);
  if (f.minPrice !== undefined && Number.isFinite(f.minPrice)) where.push(`coalesce(p.sale_price, p.price) >= ${add(f.minPrice)}`);
  if (f.maxPrice !== undefined && Number.isFinite(f.maxPrice)) where.push(`coalesce(p.sale_price, p.price) <= ${add(f.maxPrice)}`);

  const order = {
    newest: "p.created_at desc",
    price_asc: "coalesce(p.sale_price, p.price) asc",
    price_desc: "coalesce(p.sale_price, p.price) desc",
    name: "p.name_ar asc",
  }[f.sort ?? "newest"];

  const pageSize = Math.min(f.pageSize ?? 24, 60);
  const page = Math.max(1, f.page ?? 1);
  const limit = add(pageSize);
  const offset = add((page - 1) * pageSize);

  const rows = await asAnon((tx) =>
    tx.query<ProductCard & { total: string }>(
      `select ${CARD_COLUMNS}, count(*) over() as total
       from public.products p
       left join public.categories c on c.id = p.category_id
       where ${where.join(" and ")}
       order by (p.availability = 'available') desc, ${order}, p.id
       limit ${limit} offset ${offset}`,
      params,
    ),
  );
  const total = rows[0] ? Number(rows[0].total) : 0;
  return {
    items: rows.map(({ total: _t, ...r }) => { void _t; return r; }),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Distinct sizes and colors available in a listing scope (for filters). */
export async function getFilterOptions(category?: string) {
  return asAnon(async (tx) => {
    const params = category ? [category] : [];
    const scope = category ? "and c.slug = $1" : "";
    const rows = await tx.query<{ kind: string; value: string; hex: string | null }>(
      `select distinct 'size' as kind, v.size as value, null as hex
         from public.product_variants v join public.products p on p.id = v.product_id
         left join public.categories c on c.id = p.category_id
        where p.status = 'published' and v.size is not null ${scope}
       union
       select distinct 'color', v.color_name, max(v.color_hex)
         from public.product_variants v join public.products p on p.id = v.product_id
         left join public.categories c on c.id = p.category_id
        where p.status = 'published' and v.color_name is not null ${scope}
        group by v.color_name`,
      params,
    );
    return {
      sizes: rows.filter((r) => r.kind === "size").map((r) => r.value).sort(sizeOrder),
      colors: rows.filter((r) => r.kind === "color").map((r) => ({ name: r.value, hex: r.hex })),
    };
  });
}

const SIZE_RANK = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
/** Letter sizes first, then kids' ages (2Y…), then numeric sizes. */
function sizeKey(s: string): [number, number, string] {
  const up = s.toUpperCase();
  const r = SIZE_RANK.indexOf(up);
  if (r !== -1) return [0, r, s];
  const kids = /^(\d+)\s*Y$/.exec(up);
  if (kids) return [1, Number(kids[1]), s];
  const n = Number.parseFloat(s);
  if (!Number.isNaN(n)) return [2, n, s];
  return [3, 0, s];
}
function sizeOrder(a: string, b: string) {
  const ka = sizeKey(a);
  const kb = sizeKey(b);
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2], "ar");
}

export const getCategories = cache(async (): Promise<Category[]> =>
  asAnon((tx) =>
    tx.query<Category>(
      `select c.id, c.slug, c.name_ar, c.name_en, c.description_ar, c.image_url,
              (select count(*)::int from public.products p where p.category_id = c.id and p.status = 'published') as product_count
       from public.categories c
       where c.is_active
       order by c.sort_order, c.name_ar`,
    ),
  ),
);

export async function getCategory(slug: string) {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

export const getProduct = cache(async (slug: string): Promise<ProductDetail | null> =>
  asAnon(async (tx) => {
    const [p] = await tx.query<Omit<ProductDetail, "variants">>(
      `select p.id, p.slug, p.name_ar, p.name_en, p.description_ar, p.price::text, p.sale_price::text,
              p.currency_code, p.images, p.availability, p.is_demo, p.origin_country, p.return_policy,
              p.delivery_overrides, p.updated_at::text, c.slug as category_slug, c.name_ar as category_name
       from public.products p left join public.categories c on c.id = p.category_id
       where p.slug = $1 and p.status = 'published'`,
      [slug],
    );
    if (!p) return null;
    const variants = await tx.query<Variant>(
      `select id, color_name, color_hex, size, price_override::text, availability
       from public.product_variants where product_id = $1 order by sort_order, color_name, size`,
      [p.id],
    );
    return { ...p, variants };
  }),
);

export async function getRelatedProducts(productId: string, categorySlug: string | null) {
  if (!categorySlug) return [];
  return asAnon((tx) =>
    tx.query<ProductCard>(
      `select ${CARD_COLUMNS}
       from public.products p join public.categories c on c.id = p.category_id
       where p.status = 'published' and c.slug = $1 and p.id <> $2
       order by (p.availability = 'available') desc, p.created_at desc limit 4`,
      [categorySlug, productId],
    ),
  );
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  return asAnon((tx) =>
    tx.query<ProductCard>(
      `select ${CARD_COLUMNS}
       from public.products p left join public.categories c on c.id = p.category_id
       where p.status = 'published' and p.id = any($1::uuid[])`,
      [ids],
    ),
  );
}

export const getStoreSettings = cache(async (): Promise<StoreSettings> =>
  asAnon(async (tx) => {
    const [s] = await tx.query<StoreSettings>(
      `select store_name_ar, store_name_en, tagline_ar, announcement_ar, contact_email, contact_phone,
              whatsapp, default_currency, cod_enabled, manual_orders_enabled
       from public.store_settings where id = 1`,
    );
    return s;
  }),
);

/** Active shipping zones (public info only). */
export const getShippingOptions = cache(async (): Promise<ShippingOption[]> =>
  asAnon((tx) =>
    tx.query<ShippingOption>(
      `select z.id, z.country_code, c.name_ar as country_name, z.currency_code, z.rate::text,
              z.free_shipping_threshold::text, z.min_days, z.max_days, z.cod_available
       from public.shipping_zones z join public.countries c on c.code = z.country_code
       where z.is_active and c.is_active
       order by c.sort_order, c.name_ar`,
    ),
  ),
);

export const hasDemoProducts = cache(async () =>
  asAnon(async (tx) => {
    const rows = await tx.query<{ n: number }>(
      "select count(*)::int as n from public.products where is_demo and status = 'published'",
    );
    return (rows[0]?.n ?? 0) > 0;
  }),
);

export async function getPage(slug: string) {
  return asAnon(async (tx) => {
    const [p] = await tx.query<{ slug: string; title_ar: string; body_ar: string; updated_at: string }>(
      "select slug, title_ar, body_ar, updated_at::text from public.pages where slug = $1 and is_published",
      [slug],
    );
    return p ?? null;
  });
}
