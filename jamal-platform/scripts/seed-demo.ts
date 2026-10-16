/**
 * OPTIONAL demo catalog for local testing — NOT real inventory.
 *
 *   npm run seed:demo            add demo data
 *   npm run seed:demo -- --remove   delete all demo data again
 *
 * Everything created here is marked: products have is_demo = true (the store
 * shows a "منتج تجريبي" badge and a site-wide notice), orders containing them
 * are flagged is_test and excluded from sales figures, and the demo supplier /
 * shipping zones carry a note asking to replace them before launch.
 * Images are original line-art SVGs generated into public/demo/.
 */
import fs from "node:fs";
import path from "node:path";
import { getDatabase, projectRoot, withContext, type Tx } from "../src/lib/db/core";
import { artSvg } from "../src/lib/art";

const DEMO_NOTE = "بيانات تجريبية للاختبار — استبدلها بقيم حقيقية قبل الإطلاق";
const DEMO_SUPPLIER = "مورد تجريبي (للاختبار)";

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

const PRODUCTS: DemoProduct[] = [
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

async function remove(tx: Tx) {
  // Orders keep their own snapshots; product references become null.
  const p = await tx.query("delete from public.products where is_demo returning id");
  await tx.query("delete from public.suppliers where name = $1", [DEMO_SUPPLIER]);
  const z = await tx.query("delete from public.shipping_zones where notes = $1 returning id", [DEMO_NOTE]);
  console.log(`removed ${p.length} demo products, demo supplier and ${z.length} demo shipping zones`);
}

async function main() {
  const removeMode = process.argv.includes("--remove");
  await withContext({ role: "system" }, async (tx) => {
    if (removeMode) return remove(tx);

    const existing = await tx.query("select 1 from public.products where is_demo limit 1");
    if (existing.length) {
      console.log("demo data already present — run with --remove first to recreate it");
      return;
    }

    // Images
    const dir = path.join(projectRoot(), "public", "demo");
    fs.mkdirSync(dir, { recursive: true });
    for (const p of PRODUCTS) {
      fs.writeFileSync(path.join(dir, `${p.slug}.svg`), artSvg(p.category, p.bg, "#8c7356", "JAMAL · DEMO"));
      fs.writeFileSync(path.join(dir, `${p.slug}-2.svg`), artSvg(p.category, "#faf7f2", "#1d1b18", "JAMAL · DEMO"));
    }

    // Demo markets (USD so no conversion is ever implied).
    await tx.query("update public.countries set is_active = true where code in ('JO', 'SA')");
    await tx.query(
      `insert into public.shipping_zones (country_code, currency_code, name_ar, rate, free_shipping_threshold, min_days, max_days, cod_available, is_active, notes)
       values ('JO', 'USD', 'الأردن — تجريبي', 5, 100, 4, 8, true, true, $1),
              ('SA', 'USD', 'السعودية — تجريبي', 9, null, 6, 12, false, true, $1)
       on conflict (country_code, currency_code) do nothing`,
      [DEMO_NOTE],
    );
    await tx.query("update public.store_settings set cod_enabled = true where id = 1");

    const [supplier] = await tx.query<{ id: string }>(
      `insert into public.suppliers (name, country_code, ships_to, cod_countries, processing_days, notes)
       values ($1, 'TR', '{JO,SA}', '{JO}', 2, $2) returning id`,
      [DEMO_SUPPLIER, DEMO_NOTE],
    );

    for (const p of PRODUCTS) {
      const [cat] = await tx.query<{ id: string }>("select id from public.categories where slug = $1", [p.category]);
      const [prod] = await tx.query<{ id: string }>(
        `insert into public.products (slug, name_ar, name_en, description_ar, category_id, price, sale_price, currency_code,
           images, availability, status, is_featured, is_demo, return_policy, delivery_overrides)
         values ($1,$2,$3,$4,$5,$6,$7,'USD',$8::text::jsonb,$9,'published',$10,true,$11,$12::text::jsonb) returning id`,
        [
          p.slug, p.name, p.nameEn, p.description, cat?.id ?? null, p.price, p.sale ?? null,
          JSON.stringify([
            { url: `/demo/${p.slug}.svg`, alt: p.name },
            { url: `/demo/${p.slug}-2.svg`, alt: `${p.name} — صورة إضافية` },
          ]),
          p.outOfStock ? "out_of_stock" : "available",
          !!p.featured,
          "يمكن طلب الاستبدال خلال 7 أيام من الاستلام إذا كان المنتج بحالته الأصلية.",
          JSON.stringify(p.category === "shoes" ? { SA: { min: 8, max: 14 } } : {}),
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
         values ($1,$2,$3,null,$4,3,'USD',true)`,
        [supplier.id, prod.id, `SUP-${p.slug.toUpperCase()}`, p.cost],
      );
    }
    console.log(`seeded ${PRODUCTS.length} demo products (marked is_demo), 1 demo supplier, demo zones JO/SA (USD)`);
  });
  await (await getDatabase()).close();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
