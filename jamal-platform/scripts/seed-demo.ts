/**
 * OPTIONAL demo catalog for local testing — NOT real inventory.
 *
 *   npm run seed:demo               add demo data
 *   npm run seed:demo -- --remove   delete all demo data again
 */
import { getDatabase, withContext } from "../src/lib/db/core";
import { PRODUCTS, removeDemo, seedDemo } from "../src/lib/demo/seed";

async function main() {
  await withContext({ role: "system" }, async (tx) => {
    if (process.argv.includes("--remove")) {
      const r = await removeDemo(tx);
      console.log(`removed ${r.products} demo products, demo supplier and ${r.zones} demo shipping zones`);
      return;
    }
    if (await seedDemo(tx)) console.log(`seeded ${PRODUCTS.length} demo products (marked is_demo, ILS), 1 approved demo supplier, 3 demo governorate zones`);
    else console.log("demo data already present — run with --remove first to recreate it");
  });
  await (await getDatabase()).close();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
