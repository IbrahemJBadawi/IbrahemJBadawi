import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { getFilterOptions, listProducts, type ProductFilters } from "@/lib/data/catalog";
import { ProductGrid } from "@/components/product/ProductCard";
import { EmptyState, ProductGridSkeleton } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { Filters } from "./Filters";
import { Pagination } from "./Pagination";

export async function Listing({
  filters,
  basePath,
  rawParams,
  showSaleToggle = true,
}: {
  filters: ProductFilters;
  basePath: string;
  rawParams: Record<string, string | undefined>;
  showSaleToggle?: boolean;
}) {
  const [result, options] = await Promise.all([listProducts(filters), getFilterOptions(filters.category)]);
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[15rem_1fr] lg:gap-12 lg:py-12">
      <div className="lg:sticky lg:top-36 lg:self-start">
        <Suspense fallback={null}>
          <Filters options={options} showSaleToggle={showSaleToggle} />
        </Suspense>
      </div>
      <div>
        <p className="mb-6 text-sm text-muted" aria-live="polite">
          {result.total} منتج
        </p>
        {result.items.length ? (
          <>
            <ProductGrid products={result.items} />
            <Pagination page={result.page} pageCount={result.pageCount} basePath={basePath} params={rawParams} />
          </>
        ) : (
          <EmptyState
            icon={<SearchX className="size-10" strokeWidth={1.3} />}
            title="لا توجد منتجات مطابقة"
            description={filters.q ? `لم نجد نتائج لـ «${filters.q}». جرّب كلمات أخرى أو أزل بعض الفلاتر.` : "جرّب إزالة بعض الفلاتر أو تصفح فئة أخرى."}
            action={<ButtonLink href="/products" variant="outline">تصفح جميع المنتجات</ButtonLink>}
          />
        )}
      </div>
    </div>
  );
}

export function flatParams(sp: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}

export function ListingSkeleton() {
  return (
    <div className="container-page py-8 lg:py-12">
      <ProductGridSkeleton />
    </div>
  );
}
