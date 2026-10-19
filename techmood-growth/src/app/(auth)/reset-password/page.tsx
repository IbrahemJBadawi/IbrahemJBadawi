import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { ResetForm } from "../forms";

export const metadata: Metadata = { title: "كلمة مرور جديدة" };

export default async function ResetPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold">كلمة مرور جديدة</h1>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <div className="flex flex-col gap-3">
          <Alert tone="error">الرابط غير مكتمل.</Alert>
          <Link href="/forgot-password" className="font-bold text-royal">اطلب رابطًا جديدًا</Link>
        </div>
      )}
    </>
  );
}
