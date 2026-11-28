/** Deterministic, explainable styling; no personal data or remote AI calls. */
export type StudioItem = { id: string; slug: string; name_ar: string; category_slug: string | null; price: string; sale_price: string | null; currency_code: string; colors: string[]; availability: string; is_demo: boolean };
export type Occasion = "daily" | "work" | "event";
export const palettes = [
 { name: "عاجي", hex: "#f3ece0" }, { name: "بيج", hex: "#c9b79c" }, { name: "أسود", hex: "#1d1b18" },
 { name: "كحلي", hex: "#1f2a44" }, { name: "زيتي", hex: "#5b5b3a" }, { name: "وردي", hex: "#e8c4c4" },
];
export function rgb(hex: string): number[] | null {
 const m = /^#([a-f0-9]{6})$/i.exec(hex);
 return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i+2), 16)) : null;
}
export function colorDistance(a: string, b: string): number {
 const x = rgb(a), y = rgb(b);
 return x && y ? Math.hypot(...x.map((v, i) => v - y[i])) : Infinity;
}
export function matchCatalog<T extends StudioItem>(items: T[], options: { budget: number; currency: string; category: string; color: string; occasion: Occasion }): T[] {
 const preferences: Record<Occasion, string[]> = { daily: ["women", "men", "kids"], work: ["men", "women", "bags"], event: ["women", "men", "shoes", "accessories"] };
 return items.filter(p => {
  const amount = Number(p.sale_price ?? p.price);
  return p.availability === "available" && p.currency_code === options.currency && Number.isFinite(amount) && amount >= 0 && amount <= options.budget && (!options.category || p.category_slug === options.category);
 }).map(p => ({ p, score: (options.color ? Math.min(...p.colors.map(c => colorDistance(c, options.color)), 442) : 0) + (preferences[options.occasion].includes(p.category_slug ?? "") ? 0 : 25) }))
 .sort((a,b) => a.score-b.score || Number(a.p.sale_price ?? a.p.price)-Number(b.p.sale_price ?? b.p.price) || a.p.slug.localeCompare(b.p.slug))
 .map(r => r.p);
}
export function recommendedSize(usual: string, variants: { size: string | null; availability: string }[]): string | null {
 const normalized = usual.trim().toUpperCase();
 return variants.find(v => v.availability === "available" && v.size?.trim().toUpperCase() === normalized)?.size ?? null;
}
