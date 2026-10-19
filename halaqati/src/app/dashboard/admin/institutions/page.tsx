import type { Metadata } from "next";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { INSTITUTION_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { adminSetInstitutionStatusAction } from "../actions";

export const metadata: Metadata = { title: "المؤسسات والمراكز" };

type Inst = { id: string; name: string; status: string; city: string | null; country: string | null; created_at: string };

function Row({ kind, i }: { kind: "organization" | "center"; i: Inst }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{i.name}</p>
        <p className="text-sm text-muted">{[i.city, i.country].filter(Boolean).join("، ") || "—"} · {formatDate(i.created_at)}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={i.status === "verified" ? "green" : i.status === "suspended" ? "red" : "gold"}>{INSTITUTION_STATUS[i.status]}</Badge>
        <form action={adminSetInstitutionStatusAction} className="flex gap-1">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={i.id} />
          {i.status !== "verified" && <Button type="submit" name="status" value="verified" className="!min-h-10">توثيق</Button>}
          {i.status !== "suspended" && <Button type="submit" name="status" value="suspended" variant="ghost" className="!min-h-10">إيقاف</Button>}
        </form>
      </div>
    </li>
  );
}

export default async function AdminInstitutionsPage() {
  await requireContext("platform_admin");
  const supabase = await createClient();
  const [orgs, centers] = await Promise.all([
    supabase.from("organizations").select("id, name, status, city, country, created_at").is("deleted_at", null).order("status").order("created_at", { ascending: false }).limit(100),
    supabase.from("centers").select("id, name, status, city, country, created_at").is("deleted_at", null).order("status").order("created_at", { ascending: false }).limit(100),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="المؤسسات والمراكز" description="لا يظهر في الأدلة العامة إلا الموثّق." />
      <Card>
        <h2 className="mb-2 text-lg font-bold text-brand-800">الدور والمؤسسات</h2>
        {(orgs.data ?? []).length === 0 ? <EmptyState title="لا توجد مؤسسات" /> : <ul className="divide-y divide-line">{(orgs.data as Inst[]).map((i) => <Row key={i.id} kind="organization" i={i} />)}</ul>}
      </Card>
      <Card>
        <h2 className="mb-2 text-lg font-bold text-brand-800">المراكز</h2>
        {(centers.data ?? []).length === 0 ? <EmptyState title="لا توجد مراكز" /> : <ul className="divide-y divide-line">{(centers.data as Inst[]).map((i) => <Row key={i.id} kind="center" i={i} />)}</ul>}
      </Card>
    </div>
  );
}
