import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-xl font-bold">العنصر غير موجود</h1>
      <Link href="/admin" className="mt-4 inline-block text-sm underline">العودة للوحة الإدارة</Link>
    </div>
  );
}
