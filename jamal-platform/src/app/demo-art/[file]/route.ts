import { artSvg } from "@/lib/art";
import { PRODUCTS } from "@/lib/demo/seed";

/** Original line-art images for the demo catalog (no stored files needed). */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = /^([a-z0-9-]+?)(-2)?\.svg$/.exec(file);
  const p = m && PRODUCTS.find((x) => x.slug === m[1]);
  if (!p) return new Response("Not found", { status: 404 });
  const svg = m[2] ? artSvg(p.category, "#faf7f2", "#1d1b18", "JAMAL · DEMO") : artSvg(p.category, p.bg, "#8c7356", "JAMAL · DEMO");
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, immutable", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" },
  });
}
