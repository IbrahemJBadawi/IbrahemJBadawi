/**
 * OPTIONAL demo catalog — NOT real inventory. Used by `npm run seed:demo` and
 * by the self-contained demo deployment (no DATABASE_URL on Vercel).
 *
 * Everything created here is marked: products have is_demo = true (the store
 * shows a "منتج تجريبي" badge and a site-wide notice), orders containing them
 * are flagged is_test and excluded from sales figures, and the demo supplier /
 * shipping zones carry a note asking to replace them before launch.
 * Images are original line-art SVGs served from /demo-art/.
 */
import type { Tx } from "../db/core";

export const DEMO_NOTE = "بيانات تجريبية للاختبار — استبدلها بقيم حقيقية قبل الإطلاق";
export const DEMO_SUPPLIER = "مورد تجريبي (للاختبار)";

type DemoProduct = {
  slug: string;
  name: string;
  nameEn: string;
  category: string;
  price: number;
  sale?: number;
  description: string;
  colors: [string, string][];
  sizes: string[];
  bg: string;
  cost: number;
  featured?: boolean;
  outOfStock?: boolean;
};

export const PRODUCTS: DemoProduct[] = [
  { slug: "demo-linen-midi-dress", name: "فستان ميدي من الكتان", nameEn: "Linen midi dress", category: "women", price: 58, sale: 46, description: "فستان ميدي بقصة مريحة وأكمام قصيرة، مناسب للنهار.", colors: [["بيج", "#d8c7a8"], ["أسود", "#1d1b18"]], sizes: ["S", "M", "L", "XL"], bg: "#efe7da", cost: 22, featured: true },
  { slug: "demo-everyday-abaya", name: "عباية يومية خفيفة", nameEn: "Everyday light abaya", category: "women", price: 72, description: "عباية بقماش خفيف وقصة واسعة مع أكمام عريضة.", colors: [["أسود", "#1d1b18"], ["كحلي", "#1f2a44"]], sizes: ["52", "54", "56", "58"], bg: "#e9e4dc", cost: 30, featured: true },
  { slug: "demo-satin-blouse", name: "بلوزة ساتان بياقة ناعمة", nameEn: "Soft-collar satin blouse", category: "women", price: 34, description: "بلوزة ساتان بلمعة هادئة تناسب العمل والمناسبات.", colors: [["عاجي", "#f3ece0"], ["زيتي", "#5b5b3a"]], sizes: ["S", "M", "L"], bg: "#f3ece0", cost: 12 },
  { slug: "demo-oxford-shirt", name: "قميص أكسفورد قطني", nameEn: "Cotton oxford shirt", category: "men", price: 32, description: "قميص قطني كلاسيكي بقصة منتظمة.", colors: [["أبيض", "#ffffff"], ["أزرق فاتح", "#b9cde3"]], sizes: ["M", "L", "XL", "XXL"], bg: "#e8edf2", cost: 11, featured: true },
  { slug: "demo-chino-trousers", name: "بنطال تشينو مستقيم", nameEn: "Straight chino trousers", category: "men", price: 38, sale: 31, description: "بنطال تشينو بقصة مستقيمة وقماش مرن.", colors: [["بيج", "#c9b79c"], ["رمادي", "#7a7a76"]], sizes: ["30", "32", "34", "36"], bg: "#efe7da", cost: 14 },
  { slug: "demo-knit-polo", name: "قميص بولو محبوك", nameEn: "Knit polo", category: "men", price: 29, description: "بولو بنسيج محبوك يتنفس.", colors: [["كحلي", "#1f2a44"]], sizes: ["M", "L", "XL"], bg: "#e6e8ec", cost: 10, outOfStock: true },
  { slug: "demo-kids-cotton-set", name: "طقم أطفال قطني", nameEn: "Kids cotton set", category: "kids", price: 24, description: "طقم قطني ناعم من قطعتين.", colors: [["وردي", "#e8c4c4"], ["أخضر نعناعي", "#bfd8c6"]], sizes: ["2Y", "4Y", "6Y", "8Y"], bg: "#f6ecec", cost: 8 },
  { slug: "demo-kids-denim-jacket", name: "جاكيت دنيم للأطفال", nameEn: "Kids denim jacket", category: "kids", price: 31, sale: 25, description: "جاكيت دنيم خفيف بأزرار معدنية.", colors: [["أزرق", "#4a6a8f"]], sizes: ["4Y", "6Y", "8Y", "10Y"], bg: "#e3e9f0", cost: 11 },
  { slug: "demo-leather-loafers", name: "حذاء لوفر جلد", nameEn: "Leather loafers", category: "shoes", price: 64, description: "لوفر جلدي بنعل مريح.", colors: [["بني", "#6b4a32"], ["أسود", "#1d1b18"]], sizes: ["40", "41", "42", "43", "44"], bg: "#efe7da", cost: 26, featured: true },
  { slug: "demo-block-heel", name: "حذاء بكعب عريض", nameEn: "Block-heel pumps", category: "shoes", price: 49, description: "كعب عريض بارتفاع متوسط لثبات أكبر.", colors: [["نود", "#d9b99b"]], sizes: ["37", "38", "39", "40"], bg: "#f3e8dc", cost: 19 },
  { slug: "demo-structured-tote", name: "حقيبة توت مُهيكلة", nameEn: "Structured tote", category: "bags", price: 55, sale: 44, description: "حقيبة واسعة بجيوب داخلية تناسب العمل.", colors: [["كراميل", "#a8754a"], ["أسود", "#1d1b18"]], sizes: [], bg: "#efe2d2", cost: 20, featured: true },
  { slug: "demo-crossbody-mini", name: "حقيبة كروس صغيرة", nameEn: "Mini crossbody bag", category: "bags", price: 36, description: "حقيبة صغيرة بحزام قابل للتعديل.", colors: [["بيج", "#d8c7a8"]], sizes: [], bg: "#efe7da", cost: 13 },
  { slug: "demo-silk-scarf", name: "وشاح بملمس حريري", nameEn: "Silky scarf", category: "accessories", price: 19, description: "وشاح خفيف بنقشة هادئة.", colors: [["عاجي", "#f3ece0"], ["وردي غامق", "#a8646a"]], sizes: [], bg: "#f5eee6", cost: 6 },
  { slug: "demo-minimal-watch", name: "ساعة بتصميم بسيط", nameEn: "Minimal watch", category: "accessories", price: 45, description: "ساعة بمينا نظيفة وسوار جلدي.", colors: [["بني", "#6b4a32"]], sizes: [], bg: "#ece6dd", cost: 17 },
];

export async function removeDemo(tx: Tx) {
  // Orders keep their own snapshots; product references become null.
  const p = await tx.query("delete from public.products where is_demo returning id");
  await tx.query("delete from public.suppliers where name = $1", [DEMO_SUPPLIER]);
  // Zones stay (every governorate is served); only the demo fees are cleared.
  const z = await tx.query(
    "update public.shipping_zones set rate = 0, estimated_cost = null, fee_on_confirmation = true, notes = null where notes = $1 returning id",
    [DEMO_NOTE],
  );
  return { products: p.length, zones: z.length };
}

/** Adds the demo catalog once. Returns false when it was already there. */
export async function seedDemo(tx: Tx) {
  const existing = await tx.query("select 1 from public.products where is_demo limit 1");
  if (existing.length) return false;

    // Demo market: Palestine in shekels (no conversion is ever implied).
    const ils = (usd: number) => Math.round((usd * 3.6) / 5) * 5;
    const govs = await tx.query<{ id: string; name_ar: string }>(
      "select id, name_ar from public.governorates where country_code = 'PS' and name_ar in ('رام الله والبيرة', 'نابلس', 'الخليل')",
    );
    const fees: Record<string, [number, number, number, number]> = {
      "رام الله والبيرة": [20, 15, 1, 3],
      "نابلس": [25, 18, 2, 4],
      "الخليل": [30, 22, 2, 5],
    };
    for (const g of govs) {
      const [fee, cost, min, max] = fees[g.name_ar];
      // Every governorate already has a zone (migration 0008): give the demo ones real-looking fees.
      await tx.query(
        `update public.shipping_zones set rate = $2, estimated_cost = $3, min_days = $4, max_days = $5,
           fee_on_confirmation = false, notes = $6
         where country_code = 'PS' and currency_code = 'ILS' and governorate_id = $1`,
        [g.id, fee, cost, min, max, DEMO_NOTE],
      );
    }
    await tx.query(
      `update public.payment_settings set bank_transfer_enabled = true,
         instructions = coalesce(instructions, 'بيانات تجريبية: لا تحوّل أي مبلغ. أدخل بيانات الحساب الحقيقية من لوحة الإدارة قبل الإطلاق.')
       where id = 1`,
    );

    const [supplier] = await tx.query<{ id: string }>(
      `insert into public.suppliers (name, country_code, ships_to, processing_days, notes, agreement_status, coverage_areas,
         categories_supplied, accepts_single_item, accepts_dropship, accepts_pay_after_collection, accepts_cod,
         collection_party, settlement_method, terms_confirmed_at, prices_confirmed_at)
       values ($1, 'PS', '{PS}', 2, $2, 'approved', 'الضفة الغربية (تجريبي)', 'ملابس يومية', true, true, true, false,
         'platform', 'تحويل بنكي بعد تأكيد التحصيل (تجريبي)', now(), now()) returning id`,
      [DEMO_SUPPLIER, DEMO_NOTE],
    );

    for (const p of PRODUCTS) {
      const [cat] = await tx.query<{ id: string }>("select id from public.categories where slug = $1", [p.category]);
      // Inserted as draft: publishing requires an approved primary supplier (DB trigger).
      const [prod] = await tx.query<{ id: string }>(
        `insert into public.products (slug, name_ar, name_en, description_ar, category_id, price, sale_price, currency_code,
           images, availability, status, is_featured, is_demo, return_policy, processing_days, stock_confirmed_at)
         values ($1,$2,$3,$4,$5,$6,$7,'ILS',$8::text::jsonb,$9,'draft',$10,true,$11,2,now()) returning id`,
        [
          p.slug, p.name, p.nameEn, p.description, cat?.id ?? null, ils(p.price), p.sale ? ils(p.sale) : null,
          JSON.stringify([
            { url: `/demo-art/${p.slug}.svg`, alt: p.name },
            { url: `/demo-art/${p.slug}-2.svg`, alt: `${p.name} — صورة إضافية` },
          ]),
          p.outOfStock ? "out_of_stock" : "available",
          !!p.featured,
          "يمكن طلب الاستبدال خلال 7 أيام من الاستلام إذا كان المنتج بحالته الأصلية.",
        ],
      );
      let order = 0;
      const sizes = p.sizes.length ? p.sizes : [null];
      for (const [colorName, hex] of p.colors) {
        for (const size of sizes) {
          await tx.query(
            `insert into public.product_variants (product_id, color_name, color_hex, size, sku, availability, sort_order)
             values ($1,$2,$3,$4,$5,$6,$7)`,
            [prod.id, colorName, hex, size, `DEMO-${p.slug.slice(5, 13).toUpperCase()}-${order}`, size === "XL" ? "out_of_stock" : "available", order++],
          );
        }
      }
      await tx.query(
        `insert into public.supplier_products (supplier_id, product_id, supplier_sku, supplier_url, cost, shipping_cost, currency_code, is_primary)
         values ($1,$2,$3,null,$4,0,'ILS',true)`,
        [supplier.id, prod.id, `SUP-${p.slug.toUpperCase()}`, ils(p.cost)],
      );
      await tx.query("update public.products set status = 'published' where id = $1", [prod.id]);
    }
  return true;
}
