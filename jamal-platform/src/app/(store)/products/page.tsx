import type { Metadata } from "next";
import { Suspense } from "react";
import { Listing, ListingSkeleton, flatParams } from "@/components/catalog/Listing";
import { PageHeader } from "@/components/ui/States";
import { parseFilters } from "@/lib/data/filters";

export const metadata: Metadata = {
  title: "جميع المنتجات",
  description: "تصفح جميع منتجات متجر الجمال: ملابس نسائية ورجالية وأطفال، أحذية، حقائب وإكسسوارات.",
  alternates: { canonical: "/products" },
};

async function Content({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const sp = await searchParams;
  return <Listing filters={parseFilters(sp)} basePath="/products" rawParams={flatParams(sp)} />;
}

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <PageHeader eyebrow="المتجر" title="جميع المنتجات" />
      <Suspense fallback={<ListingSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}
