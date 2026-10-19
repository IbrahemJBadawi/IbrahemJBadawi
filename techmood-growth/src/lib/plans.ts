import "server-only";
import { connection } from "next/server";
import { asAnon } from "@/lib/db";
import { logError } from "@/lib/errors";

export type Plan = {
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  max_members: number | null;
  max_leads_per_month: number | null;
  max_forms: number | null;
  ai_requests_per_month: number | null;
  public_booking: boolean;
  advanced_reports: boolean;
};

/** Public plan list, read from the database (the single source of truth). */
export async function getPlans(): Promise<Plan[]> {
  await connection();
  try {
    return await asAnon((tx) =>
      tx.query<Plan>(
        `select code, name, description, price_cents, currency, max_members, max_leads_per_month, max_forms,
                ai_requests_per_month, public_booking, advanced_reports
         from public.plans where is_public order by sort_order`,
      ),
    );
  } catch (e) {
    logError("plans", e);
    return [];
  }
}

export function limitText(n: number | null, unit: string) {
  return n == null ? `${unit} غير محدود` : `${n.toLocaleString("ar")} ${unit}`;
}
