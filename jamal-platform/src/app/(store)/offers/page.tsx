import type { Metadata } from "next";
import { Suspense } from "react";
import { Listing, ListingSkeleton, flatParams } from "@/components/catalog/Listing";
import { PageHeader } from "@/components/ui/States";
import { parseFilters } from "@/lib/data/filters";

export const metadata: Metadata = {
  title: "العروض والتخفيضات",
  description: "منتجات بأسعار مخفّضة من متجر الجمال.",
  alternates: { canonical: "/offers" },
};

async function Content({ searchParams }: { searchParams: PageProps<"/offers">["searchParams"] }) {
  const sp = await searchParams;
  return <Listing filters={{ ...parseFilters(sp), onSale: true }} basePath="/offers" rawParams={flatParams(sp)} showSaleToggle={false} />;
}

export default function OffersPage({ searchParams }: PageProps<"/offers">) {
  return (
    <>
      <PageHeader eyebrow="عروض" title="العروض والتخفيضات" description="أسعار مخفّضة لفترة محدودة على قطع مختارة." />
      <Suspense fallback={<ListingSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
