import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Listing, ListingSkeleton, flatParams } from "@/components/catalog/Listing";
import { PageHeader, Skeleton } from "@/components/ui/States";
import { getCategory } from "@/lib/data/catalog";
import { parseFilters } from "@/lib/data/filters";

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) return { title: "فئة غير موجودة" };
  return {
    title: c.name_ar,
    description: c.description_ar ?? `تسوّق ${c.name_ar} من متجر الجمال.`,
    alternates: { canonical: `/category/${c.slug}` },
  };
}

async function Content({ params, searchParams }: PageProps<"/category/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();
  return (
    <>
      <PageHeader eyebrow="فئة" title={category.name_ar} description={category.description_ar} />
      <Listing filters={{ ...parseFilters(sp), category: slug }} basePath={`/category/${slug}`} rawParams={flatParams(sp)} />
    </>
  );
}

export default function CategoryPage(props: PageProps<"/category/[slug]">) {
  return (
    <Suspense fallback={<><div className="container-page py-12"><Skeleton className="h-8 w-48" /></div><ListingSkeleton /></>}>
      <Content {...props} />
    </Suspense>
  );
}
