import { getCurrentUser } from "@/lib/auth";
import { asUser } from "@/lib/db";

/** Streams a payment-proof file to admins only (checked here and by RLS). */
export async function GET(_req: Request, ctx: RouteContext<"/admin/proofs/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || !/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const [file] = await asUser(user, (tx) =>
    tx.query<{ mime_type: string; data: Uint8Array }>("select mime_type, data from public.payment_proof_files where proof_id = $1", [id]),
  );
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(file.data), {
    headers: {
      "Content-Type": file.mime_type,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
