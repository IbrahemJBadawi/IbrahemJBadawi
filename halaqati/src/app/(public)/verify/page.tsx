import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button, Card, Input, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "التحقق من شهادة" };

async function go(fd: FormData) {
  "use server";
  const serial = String(fd.get("serial") ?? "").trim().toUpperCase();
  if (/^HQ-\d{4}-[A-Z0-9]{8}$/.test(serial)) redirect(`/verify/${serial}`);
  redirect("/verify?error=1");
}

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="التحقق من شهادة" description="أدخل رقم الشهادة المكتوب عليها، مثل HQ-2026-AB12CD34." />
      <Card>
        <form action={go} className="flex flex-col gap-3">
          <label htmlFor="serial" className="font-semibold">رقم الشهادة</label>
          <Input id="serial" name="serial" dir="ltr" required className="font-mono uppercase" placeholder="HQ-2026-XXXXXXXX" />
          {sp.error && <p className="text-sm font-semibold text-danger">صيغة الرقم غير صحيحة.</p>}
          <Button type="submit">تحقّق</Button>
        </form>
      </Card>
    </div>
  );
}
