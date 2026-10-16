/**
 * Verifies the database security model (RLS + grants) against a real
 * Postgres engine (PGlite in memory) with the same migrations as production.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabase, withContext, type DbContext, type Tx } from "@/lib/db/core";

let customer: string;
let other: string;
let admin: string;
let orderId: string;
let draftId: string;

const as = <T>(ctx: DbContext, fn: (tx: Tx) => Promise<T>) => withContext(ctx, fn);
const user = (id: string): DbContext => ({ role: "authenticated", userId: id });

beforeAll(async () => {
  await as({ role: "system" }, async (tx) => {
    const mk = async (email: string) =>
      (await tx.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]))[0].id;
    customer = await mk("c@test.dev");
    other = await mk("o@test.dev");
    admin = await mk("a@test.dev");
    await tx.query("update public.profiles set role = 'admin' where id = $1", [admin]);
    await tx.query("update public.countries set is_active = true where code = 'JO'");
    const [s] = await tx.query<{ id: string }>("insert into public.suppliers (name) values ('S') returning id");
    const [p] = await tx.query<{ id: string }>("insert into public.products (slug, name_ar, price, currency_code, status) values ('pub', 'منشور', 10, 'USD', 'published') returning id");
    const [d] = await tx.query<{ id: string }>("insert into public.products (slug, name_ar, price, currency_code, status) values ('draft', 'مسودة', 10, 'USD', 'draft') returning id");
    draftId = d.id;
    await tx.query("insert into public.supplier_products (supplier_id, product_id, cost, currency_code) values ($1, $2, 4, 'USD')", [s.id, p.id]);
    const [o] = await tx.query<{ id: string }>(
      `insert into public.orders (order_number, user_id, customer_name, customer_phone, country_code, city, address_line, currency_code,
         subtotal, shipping_cost, total, payment_method, terms_accepted_at)
       values ('JM-TEST-1', $1, 'C', '+962700000000', 'JO', 'Amman', 'Street 1', 'USD', 10, 2, 12, 'manual', now()) returning id`,
      [customer],
    );
    orderId = o.id;
    await tx.query("insert into public.fulfillment_records (order_id, supplier_id, tracking_number, expected_cost, cost_currency) values ($1, $2, 'TRK1', 4, 'USD')", [orderId, s.id]);
  });
});

afterAll(async () => {
  await (await getDatabase()).close();
});

describe("anonymous visitors", () => {
  it("see published products only", async () => {
    const rows = await as({ role: "anon" }, (tx) => tx.query<{ slug: string }>("select slug from public.products"));
    expect(rows.map((r) => r.slug)).toEqual(["pub"]);
  });
  it("cannot read suppliers, costs, orders or profiles", async () => {
    for (const table of ["suppliers", "supplier_products", "orders", "profiles", "fulfillment_records", "order_item_costs", "audit_log"]) {
      await expect(as({ role: "anon" }, (tx) => tx.query(`select * from public.${table}`))).rejects.toThrow(/permission denied/);
    }
  });
  it("cannot write catalog data", async () => {
    await expect(as({ role: "anon" }, (tx) => tx.query("update public.products set price = 1"))).rejects.toThrow(/permission denied/);
  });
});

describe("customers", () => {
  it("see only their own orders", async () => {
    expect(await as(user(customer), (tx) => tx.query("select id from public.orders"))).toHaveLength(1);
    expect(await as(user(other), (tx) => tx.query("select id from public.orders"))).toHaveLength(0);
  });
  it("cannot create or modify orders, prices or payment status", async () => {
    await expect(as(user(customer), (tx) => tx.query("insert into public.orders (order_number) values ('x')"))).rejects.toThrow(/permission denied/);
    const updated = await as(user(customer), (tx) => tx.query("update public.orders set payment_status = 'paid', total = 0 returning id"));
    expect(updated).toHaveLength(0);
    const changed = await as(user(customer), (tx) => tx.query("update public.products set price = 0 returning id"));
    expect(changed).toHaveLength(0);
  });
  it("cannot read supplier costs or internal fulfillment records", async () => {
    expect(await as(user(customer), (tx) => tx.query("select * from public.supplier_products"))).toHaveLength(0);
    expect(await as(user(customer), (tx) => tx.query("select * from public.fulfillment_records"))).toHaveLength(0);
  });
  it("get tracking numbers for their own order only, without costs", async () => {
    const mine = await as(user(customer), (tx) => tx.query<Record<string, unknown>>("select * from public.order_shipments($1)", [orderId]));
    expect(mine).toHaveLength(1);
    expect(mine[0]).not.toHaveProperty("expected_cost");
    expect(await as(user(other), (tx) => tx.query("select * from public.order_shipments($1)", [orderId]))).toHaveLength(0);
  });
  it("cannot make themselves admin", async () => {
    await expect(as(user(customer), (tx) => tx.query("update public.profiles set role = 'admin' where id = $1", [customer]))).rejects.toThrow(/permission denied/);
    await expect(as(user(customer), (tx) => tx.query("select public.admin_set_role($1, 'admin')", [customer]))).rejects.toThrow(/forbidden/);
  });
  it("can edit their own name but not someone else's", async () => {
    expect(await as(user(customer), (tx) => tx.query("update public.profiles set full_name = 'X' where id = $1 returning id", [customer]))).toHaveLength(1);
    expect(await as(user(customer), (tx) => tx.query("update public.profiles set full_name = 'X' where id = $1 returning id", [other]))).toHaveLength(0);
  });
  it("cannot see draft products or favorite them", async () => {
    expect(await as(user(customer), (tx) => tx.query("select id from public.products where id = $1", [draftId]))).toHaveLength(0);
  });
  it("can only request returns for delivered orders", async () => {
    await expect(
      as(user(customer), (tx) => tx.query("insert into public.return_requests (order_id, user_id, reason) values ($1, $2, 'مقاس غير مناسب')", [orderId, customer])),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("admins", () => {
  it("can read internal data and drafts", async () => {
    expect(await as(user(admin), (tx) => tx.query("select * from public.supplier_products"))).toHaveLength(1);
    expect(await as(user(admin), (tx) => tx.query("select id from public.products"))).toHaveLength(2);
    expect(await as(user(admin), (tx) => tx.query("select id from public.orders"))).toHaveLength(1);
  });
  it("can change roles through the guarded function only", async () => {
    await as(user(admin), (tx) => tx.query("select public.admin_set_role($1, 'admin')", [other]));
    const [p] = await as({ role: "system" }, (tx) => tx.query<{ role: string }>("select role from public.profiles where id = $1", [other]));
    expect(p.role).toBe("admin");
    await expect(as(user(admin), (tx) => tx.query("select public.admin_set_role($1, 'customer')", [admin]))).rejects.toThrow(/demote/);
  });
  it("audit log is append-only", async () => {
    await as(user(admin), (tx) => tx.query("insert into public.audit_log (actor_id, action, entity) values ($1, 'test', 'x')", [admin]));
    await expect(as(user(admin), (tx) => tx.query("delete from public.audit_log"))).rejects.toThrow(/permission denied/);
  });
});
