import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { Listing, ListingSkeleton, flatParams } from "@/components/catalog/Listing";
import { parseFilters } from "@/lib/data/filters";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";

export const metadata: Metadata = { title: "البحث", robots: { index: false } };

async function Content({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  return (
    <>
      <header className="border-b border-line bg-paper/50">
        <div className="container-page py-8 md:py-12">
          <h1 className="mb-5 text-2xl font-bold md:text-3xl">البحث</h1>
          <form action="/search" role="search" className="flex max-w-xl gap-2">
            <label htmlFor="q" className="sr-only">ابحث عن منتج</label>
            <input id="q" name="q" type="search" defaultValue={filters.q ?? ""} placeholder="ابحث عن فستان، حذاء، حقيبة…" className={`${inputClass} h-12`} autoFocus={!filters.q} />
            <Button type="submit" size="lg" className="h-12" aria-label="بحث">
              <Search className="size-5" />
            </Button>
          </form>
        </div>
      </header>
      {filters.q ? (
        <Listing filters={filters} basePath="/search" rawParams={flatParams(sp)} />
      ) : (
        <p className="container-page py-12 text-sm text-muted">اكتب كلمة للبحث في أسماء المنتجات وأوصافها وفئاتها.</p>
      )}
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
