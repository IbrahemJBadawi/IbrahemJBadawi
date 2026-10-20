"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { asUser } from "@/lib/db";

export async function toggleFavorite(productId: string): Promise<{ ok: boolean; favorite?: boolean; needsLogin?: boolean }> {
  const id = z.uuid().safeParse(productId);
  if (!id.success) return { ok: false };
  const user = await getCurrentUser();
  if (!user) return { ok: false, needsLogin: true };
  const favorite = await asUser(user, async (tx) => {
    const removed = await tx.query("delete from public.favorites where user_id = $1 and product_id = $2 returning 1", [user.id, id.data]);
    if (removed.length) return false;
    // RLS: products_read only exposes published products, so a hidden id fails here.
    const exists = await tx.query("select 1 from public.products where id = $1", [id.data]);
    if (!exists.length) return null;
    await tx.query("insert into public.favorites (user_id, product_id) values ($1, $2) on conflict do nothing", [user.id, id.data]);
    return true;
  });
  if (favorite === null) return { ok: false };
  refresh();
  return { ok: true, favorite };
}
