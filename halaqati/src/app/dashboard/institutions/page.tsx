import type { Metadata } from "next";
import Link from "next/link";
import { ImageUpload } from "@/components/images/ImageUpload";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadImages } from "@/lib/data/images";
import { INSTITUTION_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "مؤسساتي" };

type Inst = { id: string; name: string; status: string; organization_id?: string | null };

/** Centers and organizations the user manages: logos (printed on certificates) and quick links. */
export default async function InstitutionsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const isAdmin = user.roles.includes("platform_admin");
  const [orgM, centerM] = await Promise.all([
    supabase.from("organization_memberships").select("organizations(id, name, status)").eq("user_id", user.id).eq("status", "active").in("role", ["owner", "admin"]),
    supabase.from("center_memberships").select("centers(id, name, status, organization_id)").eq("user_id", user.id).eq("status", "active").eq("role", "admin"),
  ]);
  const orgs = new Map<string, Inst>();
  for (const r of (orgM.data ?? []) as unknown as Array<{ organizations: Inst | null }>) if (r.organizations) orgs.set(r.organizations.id, r.organizations);
  const centers = new Map<string, Inst>();
  for (const r of (centerM.data ?? []) as unknown as Array<{ centers: Inst | null }>) if (r.centers) centers.set(r.centers.id, r.centers);
  if (orgs.size) {
    const { data } = await supabase.from("centers").select("id, name, status, organization_id").in("organization_id", [...orgs.keys()]).is("deleted_at", null).limit(200);
    for (const c of (data ?? []) as Inst[]) centers.set(c.id, c);
  }
  if (isAdmin) {
    const [o, c] = await Promise.all([
      supabase.from("organizations").select("id, name, status").is("deleted_at", null).order("name").limit(100),
      supabase.from("centers").select("id, name, status, organization_id").is("deleted_at", null).order("name").limit(200),
    ]);
    for (const x of (o.data ?? []) as Inst[]) orgs.set(x.id, x);
    for (const x of (c.data ?? []) as Inst[]) centers.set(x.id, x);
  }
  const [orgImgs, centerImgs] = await Promise.all([
    loadImages(supabase, "organization", [...orgs.keys()]),
    loadImages(supabase, "center", [...centers.keys()]),
  ]);

  return (
    <>
      <PageHeader title="مؤسساتي" description="شعار كل دار ومركز يُطبع على شهادات طلابه. التواصل مع المحفّظين من «رسائل الإدارة»." />
      {orgs.size + centers.size === 0 ? (
        <EmptyState title="لا توجد مؤسسات تديرها">تظهر هنا الدور والمراكز التي أنت في إدارتها.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {[...orgs.values()].map((o) => (
            <Card key={o.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">🏛️ {o.name}</h2>
                <span className="flex gap-2"><Badge tone={o.status === "verified" ? "green" : "gold"}>{INSTITUTION_STATUS[o.status]}</Badge>
                  <Link href={`/dashboard/staff-messages?c=organization:${o.id}`} className="text-sm font-semibold text-brand-800">رسائل الدار ←</Link></span>
              </div>
              <ImageUpload type="organization" id={o.id} current={orgImgs.get(o.id) ?? null} label={`شعار ${o.name}`} round={false} />
            </Card>
          ))}
          {[...centers.values()].map((c) => (
            <Card key={c.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">🕌 {c.name}{c.organization_id && orgs.get(c.organization_id) ? <span className="text-sm font-normal text-muted"> · {orgs.get(c.organization_id)!.name}</span> : null}</h2>
                <span className="flex gap-2"><Badge tone={c.status === "verified" ? "green" : "gold"}>{INSTITUTION_STATUS[c.status]}</Badge>
                  <Link href={`/dashboard/staff-messages?c=center:${c.id}`} className="text-sm font-semibold text-brand-800">رسائل المركز ←</Link></span>
              </div>
              <ImageUpload type="center" id={c.id} current={centerImgs.get(c.id) ?? null} label={`شعار ${c.name}`} round={false} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
