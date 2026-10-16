import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContentPage } from "@/components/ContentPage";

const POLICIES: Record<string, string> = {
  shipping: "سياسة الشحن",
  returns: "سياسة الاستبدال والإرجاع",
  privacy: "سياسة الخصوصية",
  terms: "الشروط والأحكام",
};

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: POLICIES[slug] ?? "صفحة", alternates: { canonical: `/policies/${slug}` } };
}

async function Content({ params }: { params: PageProps<"/policies/[slug]">["params"] }) {
  const { slug } = await params;
  if (!POLICIES[slug]) notFound();
  return <ContentPage slug={slug} />;
}

export default function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Content params={params} />
    </Suspense>
  );
}
