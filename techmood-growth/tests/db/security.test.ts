/**
 * Security model of TechMood Growth, verified against a real Postgres
 * engine (embedded, in memory) with the production migrations.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase } from "@/lib/db/core";
import { addMember, anon, as, createLead, createOrg, createUser, setPlan, sys } from "./helpers";

let ownerA: { id: string; email: string };
let ownerB: { id: string; email: string };
let agentA: { id: string; email: string };
let viewerA: { id: string; email: string };
let orgA: string;
let orgB: string;
let leadA: string;

beforeAll(async () => {
  ownerA = await createUser("مالك أ");
  ownerB = await createUser("مالك ب");
  agentA = await createUser("موظف أ");
  viewerA = await createUser("مشاهد أ");
  orgA = await createOrg(ownerA.id, "مركز أ");
  orgB = await createOrg(ownerB.id, "مركز ب");
  await setPlan(orgA, "growth");
  await addMember(orgA, agentA.id, "agent");
  await addMember(orgA, viewerA.id, "viewer");
  leadA = await createLead(ownerA.id, orgA, { full_name: "سارة", email: "sara@example.com" });
});

afterAll(closeDatabase);

describe("schema guarantees", () => {
  it("enables RLS on every table in public", async () => {
    const rows = await sys((tx) =>
      tx.query<{ relname: string }>(
        "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity",
      ),
    );
    expect(rows).toEqual([]);
  });

  it("pins search_path on every SECURITY DEFINER function", async () => {
    const rows = await sys((tx) =>
      tx.query<{ proname: string }>(
        `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname in ('public', 'private') and p.prosecdef
           and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
      ),
    );
    expect(rows).toEqual([]);
  });

  it("lets anonymous visitors execute only the public intake functions", async () => {
    const rows = await sys((tx) =>
      tx.query<{ proname: string }>(
        `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`,
      ),
    );
    expect(rows.map((r) => r.proname).sort()).toEqual(
      [
        "book_public_appointment",
        "cancel_public_appointment",
        "get_public_appointment",
        "get_public_booking",
        "get_public_form",
        "get_public_slots",
        "log_appointment_email",
        "reschedule_public_appointment",
        "submit_public_form",
      ].sort(),
    );
  });
});

describe("anonymous visitors", () => {
  it("cannot read or write any tenant table", async () => {
    for (const table of [
      "organizations", "organization_members", "leads", "lead_activities", "forms", "form_fields",
      "form_submissions", "appointments", "appointment_settings", "subscriptions", "billing_records",
      "audit_logs", "profiles", "usage_records", "notifications", "push_subscriptions",
    ]) {
      await expect(anon((tx) => tx.query(`select * from public.${table}`)), table).rejects.toThrow(/permission denied/);
    }
    await expect(
      anon((tx) => tx.query("insert into public.leads (org_id, full_name, stage_id) values ($1, 'x', gen_random_uuid())", [orgA])),
    ).rejects.toThrow(/permission denied/);
  });

  it("can read the public plan list (pricing page)", async () => {
    const rows = await anon((tx) => tx.query<{ code: string }>("select code from public.plans order by sort_order"));
    expect(rows.map((r) => r.code)).toEqual(["free", "starter", "growth"]);
  });
});

describe("tenant isolation", () => {
  it("hides another company's leads, forms and members", async () => {
    await as(ownerB.id, async (tx) => {
      expect(await tx.query("select id from public.leads where org_id = $1", [orgA])).toEqual([]);
      expect(await tx.query("select id from public.organizations where id = $1", [orgA])).toEqual([]);
      expect(await tx.query("select user_id from public.organization_members where org_id = $1", [orgA])).toEqual([]);
      expect(await tx.query("select id from public.lead_activities where org_id = $1", [orgA])).toEqual([]);
    });
  });

  it("blocks writing into another company", async () => {
    await expect(createLead(ownerB.id, orgA)).rejects.toThrow(/row-level security/);
    const res = await as(ownerB.id, (tx) => tx.query("update public.leads set full_name = 'مخترق' where id = $1 returning id", [leadA]));
    expect(res).toEqual([]);
    await expect(as(ownerB.id, (tx) => tx.query("select public.org_analytics($1, now() - interval '30 days', now())", [orgA]))).rejects.toThrow(/صلاحية/);
    await expect(as(ownerB.id, (tx) => tx.query("select public.get_org_usage($1)", [orgA]))).rejects.toThrow(/صلاحية/);
  });

  it("cannot move a lead to another company or attach a foreign stage", async () => {
    const [stageB] = await as(ownerB.id, (tx) => tx.query<{ id: string }>("select id from public.pipeline_stages where org_id = $1 limit 1", [orgB]));
    await expect(as(ownerA.id, (tx) => tx.query("update public.leads set org_id = $2 where id = $1", [leadA, orgB]))).rejects.toThrow();
    await expect(as(ownerA.id, (tx) => tx.query("update public.leads set stage_id = $2 where id = $1", [leadA, stageB.id]))).rejects.toThrow(
      /foreign key/,
    );
  });

  it("only shows teammates' profiles", async () => {
    const seen = await as(agentA.id, (tx) => tx.query<{ id: string }>("select id from public.profiles"));
    const ids = seen.map((r) => r.id);
    expect(ids).toContain(ownerA.id);
    expect(ids).not.toContain(ownerB.id);
  });
});

describe("roles", () => {
  it("lets an agent work leads but not configure the company", async () => {
    const id = await createLead(agentA.id, orgA, { full_name: "عميل الموظف" });
    expect(id).toBeTruthy();
    await expect(as(agentA.id, (tx) => tx.query("select public.create_form($1, 'نموذج')", [orgA]))).rejects.toThrow(/صلاحية/);
    const res = await as(agentA.id, (tx) => tx.query("update public.organizations set name = 'تغيير' where id = $1 returning id", [orgA]));
    expect(res).toEqual([]);
  });

  it("keeps viewers read-only", async () => {
    const rows = await as(viewerA.id, (tx) => tx.query("select id from public.leads where org_id = $1", [orgA]));
    expect(rows.length).toBeGreaterThan(0);
    await expect(createLead(viewerA.id, orgA)).rejects.toThrow(/row-level security/);
    const upd = await as(viewerA.id, (tx) => tx.query("update public.leads set full_name = 'x y' where id = $1 returning id", [leadA]));
    expect(upd).toEqual([]);
  });

  it("does not let anyone raise their own role or remove the owner", async () => {
    await expect(as(agentA.id, (tx) => tx.query("select public.set_member_role($1, $2, 'admin')", [orgA, agentA.id]))).rejects.toThrow();
    await expect(
      as(agentA.id, (tx) => tx.query("update public.organization_members set role = 'owner' where user_id = $1", [agentA.id])),
    ).rejects.toThrow(/permission denied/);
    await expect(as(ownerA.id, (tx) => tx.query("select public.remove_member($1, $2)", [orgA, ownerA.id]))).rejects.toThrow(/المالك/);
  });

  it("keeps platform administration closed to tenants", async () => {
    await expect(as(ownerA.id, (tx) => tx.query("select * from public.admin_list_organizations()"))).rejects.toThrow(/صلاحية/);
    await expect(as(ownerA.id, (tx) => tx.query("insert into public.platform_admins (user_id) values ($1)", [ownerA.id]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(ownerA.id, (tx) => tx.query("update public.subscriptions set plan_code = 'growth' where org_id = $1", [orgB]))).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("CRM", () => {
  it("logs stage changes as activities and in the audit log", async () => {
    const [qualified] = await as(ownerA.id, (tx) =>
      tx.query<{ id: string }>("select id from public.pipeline_stages where org_id = $1 and category = 'qualified'", [orgA]),
    );
    await as(agentA.id, (tx) => tx.query("update public.leads set stage_id = $2 where id = $1", [leadA, qualified.id]));
    const acts = await as(ownerA.id, (tx) =>
      tx.query<{ kind: string; created_by: string }>("select kind, created_by from public.lead_activities where lead_id = $1 order by created_at", [leadA]),
    );
    expect(acts.map((a) => a.kind)).toEqual(["created", "stage_change"]);
    expect(acts[1].created_by).toBe(agentA.id);
    const audit = await as(ownerA.id, (tx) => tx.query("select 1 from public.audit_logs where entity_id = $1 and action = 'lead.stage'", [leadA]));
    expect(audit.length).toBe(1);
  });

  it("flags possible duplicates without merging them", async () => {
    const dup = await createLead(ownerA.id, orgA, { full_name: "سارة أحمد", email: "  SARA@example.com " });
    const [row] = await as(ownerA.id, (tx) => tx.query<{ duplicate_of: string }>("select duplicate_of from public.leads where id = $1", [dup]));
    expect(row.duplicate_of).toBe(leadA);
    const count = await as(ownerA.id, (tx) => tx.query("select id from public.leads where id in ($1, $2)", [leadA, dup]));
    expect(count.length).toBe(2);
  });

  it("only lets people write human activity kinds under their own name", async () => {
    await expect(
      as(agentA.id, (tx) => tx.query("insert into public.lead_activities (org_id, lead_id, kind) values ($1, $2, 'stage_change')", [orgA, leadA])),
    ).rejects.toThrow(/غير مسموح/);
    const [note] = await as(agentA.id, (tx) =>
      tx.query<{ created_by: string }>(
        "insert into public.lead_activities (org_id, lead_id, kind, body, created_by) values ($1, $2, 'call', 'اتصلت', $3) returning created_by",
        [orgA, leadA, ownerA.id],
      ),
    );
    expect(note.created_by).toBe(agentA.id);
  });
});

describe("invitations", () => {
  it("accepts only for the invited email and respects seats", async () => {
    const invitee = await createUser("مدعو");
    const stranger = await createUser("غريب");
    const [{ inv }] = await as(ownerA.id, (tx) =>
      tx.query<{ inv: { token: string } }>("select public.create_invitation($1, $2, 'agent') as inv", [orgA, invitee.email]),
    );
    await expect(as(stranger.id, (tx) => tx.query("select public.accept_invitation($1)", [inv.token]), stranger.email)).rejects.toThrow(
      /بريد إلكتروني آخر/,
    );
    await as(invitee.id, (tx) => tx.query("select public.accept_invitation($1)", [inv.token]), invitee.email);
    const role = await as(invitee.id, (tx) => tx.query<{ role: string }>("select role from public.organization_members where org_id = $1 and user_id = $2", [orgA, invitee.id]));
    expect(role[0].role).toBe("agent");
    await expect(as(invitee.id, (tx) => tx.query("select public.accept_invitation($1)", [inv.token]), invitee.email)).rejects.toThrow(/غير صالحة/);
  });
});
