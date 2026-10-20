import type { MetadataRoute } from "next";
import { asAnon } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { products, categories } = await asAnon(async (tx) => ({
    products: await tx.query<{ slug: string; updated_at: string }>("select slug, updated_at::text from public.products where status = 'published' and not is_demo"),
    categories: await tx.query<{ slug: string }>("select slug from public.categories where is_active"),
  }));
  const fixed = ["", "/products", "/offers", "/contact", "/faq", "/policies/shipping", "/policies/returns", "/policies/privacy", "/policies/terms"];
  return [
    ...fixed.map((p) => ({ url: `${site}${p}` })),
    ...categories.map((c) => ({ url: `${site}/category/${c.slug}` })),
    ...products.map((p) => ({ url: `${site}/product/${p.slug}`, lastModified: new Date(p.updated_at) })),
  ];
}
