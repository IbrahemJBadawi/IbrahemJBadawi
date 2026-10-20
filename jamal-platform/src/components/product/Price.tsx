import { formatMoney } from "@/lib/money";

export function Price({
  price,
  salePrice,
  currency,
  size = "md",
}: {
  price: string;
  salePrice?: string | null;
  currency: string;
  size?: "md" | "lg";
}) {
  const big = size === "lg";
  if (salePrice) {
    const pct = Math.round((1 - Number(salePrice) / Number(price)) * 100);
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`font-bold text-danger ${big ? "text-2xl" : "text-[0.95rem]"}`}>{formatMoney(salePrice, currency)}</span>
        <s className={`text-muted ${big ? "text-base" : "text-xs"}`} aria-label="السعر قبل التخفيض">
          {formatMoney(price, currency)}
        </s>
        {big && pct > 0 && <span className="text-sm font-semibold text-danger">وفّر {pct}%</span>}
      </div>
    );
  }
  return <span className={`font-bold ${big ? "text-2xl" : "text-[0.95rem]"}`}>{formatMoney(price, currency)}</span>;
}
