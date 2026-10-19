-- =====================================================================
-- TechMood Growth — Migration 0200: CRM
-- Configurable pipeline stages, leads, follow-up activities, duplicate
-- detection (flag only, never an automatic merge) and the monthly lead
-- limit of the organization's plan.
-- =====================================================================

-- Each stage maps to a fixed category so reports stay meaningful even
-- when a company renames or adds stages.
create type public.stage_category as enum ('new', 'working', 'qualified', 'booked', 'won', 'lost');
create type public.activity_kind as enum (
  'note', 'call', 'email', 'whatsapp', 'meeting',          -- written by people
  'created', 'stage_change', 'submission', 'appointment', 'system' -- written by the system
);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  category public.stage_category not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, id)
);
create index pipeline_stages_org_idx on public.pipeline_stages (org_id, position);
create trigger pipeline_stages_org before update on public.pipeline_stages
  for each row execute function private.prevent_org_change();

create or replace function private.seed_default_stages(p_org uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.pipeline_stages (org_id, name, category, position) values
    (p_org, 'جديد', 'new', 1),
    (p_org, 'تمت محاولة التواصل', 'working', 2),
    (p_org, 'تم التواصل', 'working', 3),
    (p_org, 'مؤهل', 'qualified', 4),
    (p_org, 'موعد محجوز', 'booked', 5),
    (p_org, 'تحوّل إلى عميل', 'won', 6),
    (p_org, 'غير مؤهل', 'lost', 7)
$$;

create or replace function private.first_stage(p_org uuid, p_category public.stage_category default null)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.pipeline_stages
  where org_id = p_org and (p_category is null or category = p_category)
  order by position, created_at limit 1
$$;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (phone is null or char_length(phone) <= 32),
  email_norm text generated always as (nullif(lower(btrim(email)), '')) stored,
  phone_norm text generated always as (nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')) stored,
  needs text check (needs is null or char_length(needs) <= 4000),
  -- Where the lead came from: manual, form, booking, import, referral, …
  source text not null default 'manual' check (char_length(source) between 1 and 40),
  utm_source text check (utm_source is null or char_length(utm_source) <= 100),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 100),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 150),
  referrer text check (referrer is null or char_length(referrer) <= 500),
  form_id uuid,
  stage_id uuid not null,
  owner_id uuid references public.profiles (id) on delete set null,
  next_follow_up_at timestamptz,
  -- Possible duplicate of an older lead with the same email or phone.
  -- Only a flag for people to review; records are never merged here.
  duplicate_of uuid,
  consent_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, stage_id) references public.pipeline_stages (org_id, id) on delete restrict,
  foreign key (org_id, duplicate_of) references public.leads (org_id, id) on delete set null (duplicate_of)
);
create index leads_org_created_idx on public.leads (org_id, created_at desc);
create index leads_org_stage_idx on public.leads (org_id, stage_id) where archived_at is null;
create index leads_org_email_idx on public.leads (org_id, email_norm) where email_norm is not null;
create index leads_org_phone_idx on public.leads (org_id, phone_norm) where phone_norm is not null;
create index leads_follow_up_idx on public.leads (org_id, next_follow_up_at) where archived_at is null and next_follow_up_at is not null;
create trigger leads_updated_at before update on public.leads
  for each row execute function private.set_updated_at();
create trigger leads_org before update on public.leads
  for each row execute function private.prevent_org_change();

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  lead_id uuid not null,
  kind public.activity_kind not null,
  body text check (body is null or char_length(body) <= 4000),
  meta jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (org_id, lead_id) references public.leads (org_id, id) on delete cascade
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);
create trigger lead_activities_org before update on public.lead_activities
  for each row execute function private.prevent_org_change();

-- ---------------------------------------------------------------------
-- Lead triggers
-- ---------------------------------------------------------------------
create or replace function private.lead_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_plan public.plans := private.effective_plan(new.org_id);
  -- Generated columns are not computed yet in a BEFORE trigger.
  v_email text := nullif(lower(btrim(coalesce(new.email, ''))), '');
  v_phone text := nullif(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), '');
begin
  if new.stage_id is null then
    new.stage_id := private.first_stage(new.org_id);
  end if;
  if new.owner_id is not null and not private.is_member(new.org_id, new.owner_id) then
    raise exception 'المسؤول المحدد ليس عضوًا في الشركة' using errcode = '22023';
  end if;
  select l.id into new.duplicate_of
  from public.leads l
  where l.org_id = new.org_id
    and ((v_email is not null and l.email_norm = v_email) or (v_phone is not null and l.phone_norm = v_phone))
  order by l.created_at limit 1;
  perform private.consume_usage(new.org_id, 'leads', v_plan.max_leads_per_month,
    format('بلغت الشركة الحد الشهري للعملاء المحتملين في خطة %s (%s). رقِّ الخطة لاستقبال المزيد.', v_plan.name, v_plan.max_leads_per_month));
  return new;
end $$;
create trigger leads_before_insert before insert on public.leads
  for each row execute function private.lead_before_insert();

create or replace function private.lead_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lead_activities (org_id, lead_id, kind, body, meta, created_by)
  values (new.org_id, new.id, 'created', null, jsonb_build_object('source', new.source), auth.uid());
  perform private.audit(new.org_id, 'lead.create', 'lead', new.id, jsonb_build_object('source', new.source));
  return new;
end $$;
create trigger leads_after_insert after insert on public.leads
  for each row execute function private.lead_after_insert();

create or replace function private.lead_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id and new.owner_id is not null
     and not private.is_member(new.org_id, new.owner_id) then
    raise exception 'المسؤول المحدد ليس عضوًا في الشركة' using errcode = '22023';
  end if;
  -- System-maintained columns.
  new.created_at := old.created_at;
  new.created_by := old.created_by;
  new.consent_at := old.consent_at;
  new.form_id := old.form_id;
  return new;
end $$;
create trigger leads_before_update before update on public.leads
  for each row execute function private.lead_before_update();

create or replace function private.lead_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_from text;
  v_to text;
begin
  if new.stage_id is distinct from old.stage_id then
    select name into v_from from public.pipeline_stages where id = old.stage_id;
    select name into v_to from public.pipeline_stages where id = new.stage_id;
    insert into public.lead_activities (org_id, lead_id, kind, body, meta, created_by)
    values (new.org_id, new.id, 'stage_change', null,
            jsonb_build_object('from', v_from, 'to', v_to, 'from_id', old.stage_id, 'to_id', new.stage_id), auth.uid());
    perform private.audit(new.org_id, 'lead.stage', 'lead', new.id, jsonb_build_object('from', v_from, 'to', v_to));
  end if;
  if new.owner_id is distinct from old.owner_id then
    perform private.audit(new.org_id, 'lead.owner', 'lead', new.id, jsonb_build_object('owner_id', new.owner_id));
  end if;
  if new.archived_at is distinct from old.archived_at then
    perform private.audit(new.org_id, case when new.archived_at is null then 'lead.restore' else 'lead.archive' end, 'lead', new.id);
  end if;
  return new;
end $$;
create trigger leads_after_update after update on public.leads
  for each row execute function private.lead_after_update();

create or replace function private.lead_after_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.audit(old.org_id, 'lead.delete', 'lead', old.id);
  return old;
end $$;
create trigger leads_after_delete after delete on public.leads
  for each row execute function private.lead_after_delete();

-- People may only write the human activity kinds, under their own name.
create or replace function private.activity_before_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.kind not in ('note', 'call', 'email', 'whatsapp', 'meeting') then
      raise exception 'نوع النشاط غير مسموح' using errcode = '42501';
    end if;
    new.created_by := auth.uid();
    new.meta := '{}'::jsonb;
    new.created_at := now();
  end if;
  return new;
end $$;
create trigger lead_activities_before_insert before insert on public.lead_activities
  for each row execute function private.activity_before_insert();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.pipeline_stages enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

create policy stages_select on public.pipeline_stages for select to authenticated using (private.is_member(org_id));
create policy stages_insert on public.pipeline_stages for insert to authenticated with check (private.is_org_admin(org_id));
create policy stages_update on public.pipeline_stages for update to authenticated
  using (private.is_org_admin(org_id)) with check (private.is_org_admin(org_id));
create policy stages_delete on public.pipeline_stages for delete to authenticated using (private.is_org_admin(org_id));

create policy leads_select on public.leads for select to authenticated using (private.is_member(org_id));
create policy leads_insert on public.leads for insert to authenticated
  with check (private.can_write(org_id) and created_by = auth.uid());
create policy leads_update on public.leads for update to authenticated
  using (private.can_write(org_id)) with check (private.can_write(org_id));
create policy leads_delete on public.leads for delete to authenticated using (private.is_org_admin(org_id));

create policy activities_select on public.lead_activities for select to authenticated using (private.is_member(org_id));
create policy activities_insert on public.lead_activities for insert to authenticated with check (private.can_write(org_id));
create policy activities_delete on public.lead_activities for delete to authenticated
  using (kind in ('note', 'call', 'email', 'whatsapp', 'meeting')
         and (created_by = auth.uid() or private.is_org_admin(org_id)));

revoke all on public.pipeline_stages, public.leads, public.lead_activities from anon;
revoke update on public.lead_activities from authenticated;
