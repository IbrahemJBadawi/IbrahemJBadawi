import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { myChildren } from "@/lib/data/children";
import { personName } from "@/lib/data/halaqat";
import { formatDate } from "@/lib/format";
import { RELATIONSHIP } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { revokeLinkAction } from "../profile/parent-link-actions";
import { RedeemForm } from "./RedeemForm";

export const metadata: Metadata = { title: "الأبناء" };

export default async function ChildrenPage() {
  const user = await requireContext("parent");
  const supabase = await createClient();
  const { rows } = await myChildren(supabase, user.id);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="الأبناء المرتبطون" description="لا يظهر لك إلا من منحك رمز الربط بنفسه، ويمكنه إلغاء الربط في أي وقت." />
      <Card>
        <h2 className="mb-3 text-lg font-bold text-brand-800">ربط ابن</h2>
        <RedeemForm />
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="لا يوجد أبناء مرتبطون بعد" />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <Link href={`/dashboard/children/${c.student_id}`} className="text-lg font-bold text-brand-900 underline">{personName(c.profiles)}</Link>
                  <p className="text-sm text-muted">{RELATIONSHIP[c.relationship]} · منذ {formatDate(c.created_at)}</p>
                </div>
                <form action={revokeLinkAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" variant="ghost" className="text-sm">إلغاء الربط</Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
