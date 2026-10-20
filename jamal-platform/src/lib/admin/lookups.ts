import "server-only";
import type { Tx } from "@/lib/db";

export async function lookups(tx: Tx) {
  const categories = await tx.query<{ id: string; name_ar: string }>("select id, name_ar from public.categories order by sort_order, name_ar");
  const currencies = await tx.query<{ code: string; name_ar: string; is_active: boolean }>("select code, name_ar, is_active from public.currencies order by is_active desc, code");
  const suppliers = await tx.query<{ id: string; name: string }>("select id, name from public.suppliers order by is_active desc, name");
  const countries = await tx.query<{ code: string; name_ar: string; is_active: boolean; default_currency: string | null }>("select code, name_ar, is_active, default_currency from public.countries order by sort_order");
  return { categories, currencies, suppliers, countries };
}
