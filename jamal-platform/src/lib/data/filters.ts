import { SORTS, type ProductFilters, type Sort } from "./catalog";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(sp: SP): ProductFilters {
  const num = (v?: string) => {
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const sort = one(sp.sort);
  const page = Number(one(sp.page));
  return {
    q: one(sp.q)?.slice(0, 80) || undefined,
    size: one(sp.size) || undefined,
    color: one(sp.color) || undefined,
    minPrice: num(one(sp.min)),
    maxPrice: num(one(sp.max)),
    onSale: one(sp.sale) === "1" || undefined,
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}
