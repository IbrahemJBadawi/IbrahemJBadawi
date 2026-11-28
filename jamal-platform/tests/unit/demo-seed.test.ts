import { afterAll, expect, it } from "vitest";
import { getDatabase } from "@/lib/db/core";
import { PRODUCTS, seedDemo } from "@/lib/demo/seed";

afterAll(async()=>{await (await getDatabase()).close();});
it("initializes every demo product and UUID variant in real PGlite, idempotently",async()=>{
 const db=await getDatabase();
 await db.transaction(async tx=>{
  await seedDemo(tx);
  expect(await seedDemo(tx)).toBe(false);
  const [counts]=await tx.query<{products:number;variants:number;orphaned:number}>(`select
   (select count(*)::int from public.products where is_demo) as products,
   (select count(*)::int from public.product_variants v join public.products p on p.id=v.product_id where p.is_demo) as variants,
   (select count(*)::int from public.product_variants v left join public.products p on p.id=v.product_id where p.id is null) as orphaned`);
  expect(counts.products).toBe(PRODUCTS.length);
  expect(counts.variants).toBe(PRODUCTS.reduce((n,p)=>n+p.colors.length*Math.max(1,p.sizes.length),0));
  expect(counts.orphaned).toBe(0);
 });
},60000);
