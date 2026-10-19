/**
 * Public intake (forms and booking), plan limits, billing, AI metering,
 * notifications and analytics — on the real migrations.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase } from "@/lib/db/core";
import { addMember, anon, as, createLead, createOrg, createUser, setPlan, sys } from "./helpers";

let owner: { id: string; email: string };
let agent: { id: string; email: string };
let org: string;
let formSlug: string;
let formId: string;

async function publishForm(userId: string, orgId: string, name = "طلب استشارة") {
  const [{ id }] = await as(userId, (tx) => tx.query<{ id: string }>("select public.create_form($1, $2) as id", [orgId, name]));
  const [{ slug }] = await as(userId, (tx) =>
    tx.query<{ slug: string }>("update public.forms set status = 'published' where id = $1 returning slug", [id]),
  );
  return { id, slug };
}

const submit = (slug: string, answers: Record<string, unknown>, consent = true, meta: Record<string, unknown> = {}, key: string | null = null) =>
  anon((tx) =>
    tx.query<{ r: { ok: boolean; message: string } }>("select public.submit_public_form($1, $2, $3, $4, $5) as r", [
      slug,
      JSON.stringify(answers),
      consent,
      JSON.stringify(meta),
      key,
    ]),
  );

beforeAll(async () => {
  owner = await createUser("مالك");
  agent = await createUser("موظف");
  org = await createOrg(owner.id, "أكاديمية النمو");
  await setPlan(org, "growth");
  await addMember(org, agent.id, "agent");
  ({ id: formId, slug: formSlug } = await publishForm(owner.id, org));
});

afterAll(closeDatabase);

describe("public forms", () => {
  it("exposes only the published form definition", async () => {
    const [{ f }] = await anon((tx) => tx.query<{ f: Record<string, unknown> }>("select public.get_public_form($1) as f", [formSlug]));
    expect(f.org_name).toBe("أكاديمية النمو");
    expect(Object.keys(f)).not.toContain("org_id");
    const [{ draft }] = await as(owner.id, (tx) => tx.query<{ draft: string }>("select public.create_form($1, 'مسودة') as draft", [org]));
    const [{ slug }] = await as(owner.id, (tx) => tx.query<{ slug: string }>("select slug from public.forms where id = $1", [draft]));
    const [{ g }] = await anon((tx) => tx.query<{ g: unknown }>("select public.get_public_form($1) as g", [slug]));
    expect(g).toBeNull();
  });

  it("creates a lead with source, campaign, consent and a team notification", async () => {
    const [{ r }] = await submit(
      formSlug,
      { full_name: "خالد", phone: "+966 50 123 4567", email: "KHALED@Example.com", needs: "دورة تحليل بيانات", hacker: "x" },
      true,
      { utm_source: "instagram", utm_campaign: "fall-2026", referrer: "https://instagram.com" },
    );
    expect(r.ok).toBe(true);
    const [lead] = await as(agent.id, (tx) =>
      tx.query<{ id: string; email: string; source: string; utm_campaign: string; consent_at: string; form_id: string; stage: string }>(
        `select l.id, l.email, l.source, l.utm_campaign, l.consent_at, l.form_id, s.category as stage
         from public.leads l join public.pipeline_stages s on s.id = l.stage_id where l.full_name = 'خالد'`,
      ),
    );
    expect(lead).toMatchObject({ email: "khaled@example.com", source: "instagram", utm_campaign: "fall-2026", form_id: formId, stage: "new" });
    expect(lead.consent_at).toBeTruthy();
    const [sub] = await as(owner.id, (tx) => tx.query<{ answers: Record<string, string> }>("select answers from public.form_submissions where lead_id = $1", [lead.id]));
    expect(sub.answers).not.toHaveProperty("hacker");
    const notes = await as(agent.id, (tx) => tx.query<{ link: string; body: string }>("select link, body from public.notifications where kind = 'lead'"));
    expect(notes.length).toBe(1);
    expect(notes[0].link).toBe(`/dashboard/leads/${lead.id}`);
    expect(notes[0].body).not.toContain("khaled");
  });

  it("validates required fields, formats and consent on the server", async () => {
    await expect(submit(formSlug, { full_name: "ليلى", phone: "+966501234567" }, false)).rejects.toThrow(/الموافقة/);
    await expect(submit(formSlug, { full_name: "ليلى" })).rejects.toThrow(/مطلوب/);
    await expect(submit(formSlug, { full_name: "ليلى", phone: "abc" })).rejects.toThrow(/الهاتف/);
    await expect(submit(formSlug, { full_name: "ليلى", phone: "+966501234567", email: "not-an-email" })).rejects.toThrow(/البريد/);
    await expect(submit("no-such-form", { full_name: "ليلى" })).rejects.toThrow(/غير متاح/);
  });

  it("rate-limits a visitor hammering the form", async () => {
    const { slug } = await publishForm(owner.id, org, "نموذج الحد");
    for (let i = 0; i < 5; i++) await submit(slug, { full_name: `زائر ${i}`, phone: `+96650000000${i}` }, true, {}, "visitor-1");
    await expect(submit(slug, { full_name: "زائر 6", phone: "+966500000009" }, true, {}, "visitor-1")).rejects.toThrow(/عدة طلبات/);
  });

  it("refuses to publish a form without a way to reply", async () => {
    const [{ id }] = await as(owner.id, (tx) => tx.query<{ id: string }>("select public.create_form($1, 'بلا تواصل') as id", [org]));
    await as(owner.id, (tx) => tx.query("update public.form_fields set required = false where form_id = $1 and maps_to in ('email','phone')", [id]));
    await expect(as(owner.id, (tx) => tx.query("update public.forms set status = 'published' where id = $1", [id]))).rejects.toThrow(/البريد أو الهاتف/);
  });
});

describe("plan limits (enforced in the database)", () => {
  it("caps monthly leads on the Free plan, for staff and public forms alike", async () => {
    const o = await createUser("مالك مجاني");
    const freeOrg = await createOrg(o.id, "مركز مجاني");
    await sys((tx) => tx.query("update public.plans set max_leads_per_month = 3 where code = 'free'"));
    try {
      const { slug } = await publishForm(o.id, freeOrg);
      await createLead(o.id, freeOrg);
      await createLead(o.id, freeOrg);
      await submit(slug, { full_name: "عميل", phone: "+966511111111" });
      await expect(createLead(o.id, freeOrg)).rejects.toThrow(/الحد الشهري/);
      await expect(submit(slug, { full_name: "آخر", phone: "+966522222222" })).rejects.toThrow(/الحد الشهري/);
      // Deleting does not give quota back.
      await as(o.id, (tx) => tx.query("delete from public.leads where org_id = $1", [freeOrg]));
      await expect(createLead(o.id, freeOrg)).rejects.toThrow(/الحد الشهري/);
    } finally {
      await sys((tx) => tx.query("update public.plans set max_leads_per_month = 30 where code = 'free'"));
    }
  });

  it("caps active forms and seats on the Free plan", async () => {
    const o = await createUser("مالك مجاني 2");
    const freeOrg = await createOrg(o.id, "مركز مجاني 2");
    await as(o.id, (tx) => tx.query("select public.create_form($1, 'الأول')", [freeOrg]));
    await expect(as(o.id, (tx) => tx.query("select public.create_form($1, 'الثاني')", [freeOrg]))).rejects.toThrow(/نموذج نشط/);
    await expect(as(o.id, (tx) => tx.query("select public.create_invitation($1, 'new@test.dev', 'agent')", [freeOrg]))).rejects.toThrow(
      /أعضاء الفريق/,
    );
  });

  it("starts a 14-day Growth trial once, then falls back to Free when it lapses", async () => {
    const o = await createUser("مالك تجربة");
    const trialOrg = await createOrg(o.id, "مركز تجربة");
    await as(o.id, (tx) => tx.query("select public.start_trial($1)", [trialOrg]));
    const [u1] = await as(o.id, (tx) => tx.query<{ u: { plan: { code: string } } }>("select public.get_org_usage($1) as u", [trialOrg]));
    expect(u1.u.plan.code).toBe("growth");
    await expect(as(o.id, (tx) => tx.query("select public.start_trial($1)", [trialOrg]))).rejects.toThrow(/من قبل/);
    await sys((tx) => tx.query("update public.subscriptions set trial_ends_at = now() - interval '1 day' where org_id = $1", [trialOrg]));
    const [u2] = await as(o.id, (tx) => tx.query<{ u: { plan: { code: string } } }>("select public.get_org_usage($1) as u", [trialOrg]));
    expect(u2.u.plan.code).toBe("free");
  });
});

describe("appointments", () => {
  let bookingSlug: string;
  let day: string;

  beforeAll(async () => {
    // Open every day 09:00–12:00 Riyadh, 30-minute slots, no notice.
    const [row] = await as(owner.id, (tx) =>
      tx.query<{ slug: string }>(
        `update public.appointment_settings set enabled = true, min_notice_minutes = 0, duration_minutes = 30, slot_step_minutes = 30,
           weekly_hours = '{"0":[["09:00","12:00"]],"1":[["09:00","12:00"]],"2":[["09:00","12:00"]],"3":[["09:00","12:00"]],"4":[["09:00","12:00"]],"5":[["09:00","12:00"]],"6":[["09:00","12:00"]]}'
         where org_id = $1 returning slug`,
        [org],
      ),
    );
    bookingSlug = row.slug;
    const [d] = await sys((tx) => tx.query<{ d: string }>("select ((now() at time zone 'Asia/Riyadh')::date + 2)::text as d"));
    day = d.d;
  });

  const book = (startsAt: string, email = "client@example.com", key: string | null = null) =>
    anon((tx) =>
      tx.query<{ r: { manage_token: string; appointment_id: string } }>(
        "select public.book_public_appointment($1, $2, 'عميل الحجز', $3, null, null, true, $4) as r",
        [bookingSlug, startsAt, email, key],
      ),
    );

  it("lists slots in the company's time zone", async () => {
    const slots = await anon((tx) => tx.query<{ starts_at: Date }>("select starts_at from public.get_public_slots($1, $2::date, 1)", [bookingSlug, day]));
    expect(slots.length).toBe(6);
    // 09:00 Riyadh = 06:00 UTC
    expect(new Date(slots[0].starts_at).toISOString()).toBe(`${day}T06:00:00.000Z`);
  });

  it("books a slot, creates the lead, moves it to «booked» and hides the slot", async () => {
    const start = `${day}T06:00:00Z`;
    const [{ r }] = await book(start);
    expect(r.manage_token).toHaveLength(64);
    const [lead] = await as(owner.id, (tx) =>
      tx.query<{ category: string; source: string }>(
        `select s.category, l.source from public.appointments a join public.leads l on l.id = a.lead_id
         join public.pipeline_stages s on s.id = l.stage_id where a.id = $1`,
        [r.appointment_id],
      ),
    );
    expect(lead).toEqual({ category: "booked", source: "booking" });
    const slots = await anon((tx) => tx.query("select starts_at from public.get_public_slots($1, $2::date, 1)", [bookingSlug, day]));
    expect(slots.length).toBe(5);
  });

  it("prevents double booking on every path", async () => {
    const start = `${day}T06:30:00Z`;
    await book(start, "first@example.com");
    await expect(book(start, "second@example.com")).rejects.toThrow(/لم يعد متاحًا/);
    // Staff cannot overlap it either, even with an off-grid time.
    await expect(
      as(agent.id, (tx) =>
        tx.query("insert into public.appointments (org_id, title, starts_at, ends_at, blocked_until, created_by) values ($1, 'داخلي', $2, $3, $3, $4)", [
          org,
          `${day}T06:45:00Z`,
          `${day}T07:15:00Z`,
          agent.id,
        ]),
      ),
    ).rejects.toThrow(/يتعارض/);
  });

  it("lets the token holder cancel (freeing the slot) and nobody else", async () => {
    const start = `${day}T07:00:00Z`;
    const [{ r }] = await book(start, "cancel@example.com");
    const [{ a }] = await anon((tx) => tx.query<{ a: { status: string; title: string } }>("select public.get_public_appointment($1) as a", [r.manage_token]));
    expect(a.status).toBe("booked");
    const [{ x }] = await anon((tx) => tx.query<{ x: unknown }>("select public.get_public_appointment($1) as x", ["0".repeat(64)]));
    expect(x).toBeNull();
    await anon((tx) => tx.query("select public.cancel_public_appointment($1)", [r.manage_token]));
    await book(start, "next@example.com");
    const canceled = await as(owner.id, (tx) => tx.query("select 1 from public.notifications where kind = 'booking_canceled'"));
    expect(canceled.length).toBe(1);
  });

  it("rejects times that are not published slots", async () => {
    await expect(book(`${day}T06:10:00Z`, "odd@example.com")).rejects.toThrow(/لم يعد متاحًا/);
    await expect(book(`${day}T15:00:00Z`, "late@example.com")).rejects.toThrow(/لم يعد متاحًا/);
  });

  it("validates weekly hours", async () => {
    await expect(
      as(owner.id, (tx) => tx.query(`update public.appointment_settings set weekly_hours = '{"1":[["12:00","09:00"]]}' where org_id = $1`, [org])),
    ).rejects.toThrow(/فترة عمل/);
  });
});

describe("billing and AI metering", () => {
  it("activates a plan only after a platform admin verifies a manual payment", async () => {
    const o = await createUser("مالك دفع");
    const payOrg = await createOrg(o.id, "مركز دفع");
    const admin = await createUser("مدير المنصة");
    await sys((tx) => tx.query("insert into public.platform_admins (user_id) values ($1)", [admin.id]));
    const [{ id }] = await as(o.id, (tx) =>
      tx.query<{ id: string }>("select public.submit_payment_notice($1, 'starter', 2, 'bank_transfer', 'TRX-1') as id", [payOrg]),
    );
    const [rec] = await as(o.id, (tx) => tx.query<{ amount_cents: number; status: string }>("select amount_cents, status from public.billing_records where id = $1", [id]));
    expect(rec).toEqual({ amount_cents: 3800, status: "pending" });
    await expect(as(o.id, (tx) => tx.query("select public.admin_review_payment($1, true)", [id]))).rejects.toThrow(/صلاحية/);
    await as(admin.id, (tx) => tx.query("select public.admin_review_payment($1, true, 'تم')", [id]));
    const [{ u }] = await as(o.id, (tx) => tx.query<{ u: { plan: { code: string } } }>("select public.get_org_usage($1) as u", [payOrg]));
    expect(u.plan.code).toBe("starter");
    const notes = await as(o.id, (tx) => tx.query("select 1 from public.notifications where kind = 'billing'"));
    expect(notes.length).toBe(1);
    // Platform admins still cannot read the tenant's leads.
    await createLead(o.id, payOrg);
    expect(await as(admin.id, (tx) => tx.query("select id from public.leads where org_id = $1", [payOrg]))).toEqual([]);
  });

  it("meters AI requests per plan", async () => {
    const o = await createUser("مالك ذكاء");
    const aiOrg = await createOrg(o.id, "مركز ذكاء");
    await expect(as(o.id, (tx) => tx.query("select public.consume_ai_request($1)", [aiOrg]))).rejects.toThrow(/Growth/);
    await setPlan(aiOrg, "growth");
    const [{ r }] = await as(o.id, (tx) => tx.query<{ r: { used: number; limit: number } }>("select public.consume_ai_request($1) as r", [aiOrg]));
    expect(r).toEqual({ used: 1, limit: 300 });
  });
});

describe("analytics", () => {
  it("computes KPIs from real rows and gates advanced sections by plan", async () => {
    const [{ a }] = await as(owner.id, (tx) =>
      tx.query<{ a: { kpis: { leads: number; conversion_rate: number | null }; advanced: boolean; forms: unknown[]; previous: unknown } }>(
        "select public.org_analytics($1, now() - interval '30 days', now() + interval '1 minute') as a",
        [org],
      ),
    );
    const [{ n }] = await as(owner.id, (tx) => tx.query<{ n: number }>("select count(*)::int as n from public.leads where org_id = $1", [org]));
    expect(a.kpis.leads).toBe(n);
    expect(a.advanced).toBe(true);
    expect(a.forms.length).toBeGreaterThan(0);
    expect(a.previous).toBeTruthy();

    const o = await createUser("مالك تقارير");
    const basic = await createOrg(o.id, "مركز تقارير");
    const [{ b }] = await as(o.id, (tx) =>
      tx.query<{ b: { kpis: { leads: number; conversion_rate: number | null }; advanced: boolean; forms?: unknown } }>(
        "select public.org_analytics($1, now() - interval '30 days', now()) as b",
        [basic],
      ),
    );
    expect(b.kpis.leads).toBe(0);
    expect(b.kpis.conversion_rate).toBeNull();
    expect(b.advanced).toBe(false);
    expect(b.forms).toBeUndefined();
  });
});
