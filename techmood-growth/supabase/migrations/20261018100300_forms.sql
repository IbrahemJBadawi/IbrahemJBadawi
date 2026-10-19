-- =====================================================================
-- TechMood Growth — Migration 0300: Forms and public intake
-- Form builder (forms + fields), published public forms reachable only
-- through narrow SECURITY DEFINER functions, submissions that become
-- leads, consent capture, spam protection and per-form rate limits.
--
-- Anonymous visitors can read a published form's definition and submit
-- it. They can never select from any table.
-- =====================================================================

create type public.form_status as enum ('draft', 'published', 'archived');
create type public.field_type as enum ('text', 'email', 'phone', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date');
-- Which lead column a field fills. NULL = an extra answer kept on the submission.
create type public.field_target as enum ('full_name', 'email', 'phone', 'needs');

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text check (description is null or char_length(description) <= 2000),
  headline text check (headline is null or char_length(headline) <= 160),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,60}$'),
  status public.form_status not null default 'draft',
  success_message text not null default 'شكرًا لك! وصلنا طلبك وسنتواصل معك قريبًا.'
    check (char_length(success_message) between 2 and 500),
  privacy_notice text not null default 'نستخدم بياناتك للتواصل معك بخصوص طلبك فقط، ولا نشاركها مع أي طرف ثالث.'
    check (char_length(privacy_notice) between 10 and 1500),
  consent_label text not null default 'أوافق على استخدام بياناتي للتواصل معي بخصوص هذا الطلب.'
    check (char_length(consent_label) between 5 and 300),
  -- Source recorded on leads from this form (e.g. "instagram-ad").
  source_label text not null default 'form' check (source_label ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);
create index forms_org_idx on public.forms (org_id, created_at desc);
create trigger forms_updated_at before update on public.forms
  for each row execute function private.set_updated_at();
create trigger forms_org before update on public.forms
  for each row execute function private.prevent_org_change();

alter table public.leads
  add constraint leads_form_fk foreign key (org_id, form_id) references public.forms (org_id, id) on delete set null (form_id);
create index leads_form_idx on public.leads (form_id) where form_id is not null;

create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  form_id uuid not null,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null check (char_length(btrim(label)) between 1 and 160),
  type public.field_type not null,
  required boolean not null default false,
  placeholder text check (placeholder is null or char_length(placeholder) <= 160),
  help_text text check (help_text is null or char_length(help_text) <= 300),
  options text[] not null default '{}' check (cardinality(options) <= 30),
  maps_to public.field_target,
  -- Qualification questions are highlighted on the lead page.
  is_qualification boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (form_id, key),
  foreign key (org_id, form_id) references public.forms (org_id, id) on delete cascade
);
create unique index form_fields_target_unique on public.form_fields (form_id, maps_to) where maps_to is not null;
create index form_fields_form_idx on public.form_fields (form_id, position);
create trigger form_fields_org before update on public.form_fields
  for each row execute function private.prevent_org_change();

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  form_id uuid not null,
  lead_id uuid,
  answers jsonb not null default '{}'::jsonb,
  consent_text text,
  consent_at timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  created_at timestamptz not null default now(),
  foreign key (org_id, form_id) references public.forms (org_id, id) on delete cascade,
  foreign key (org_id, lead_id) references public.leads (org_id, id) on delete set null (lead_id)
);
create index form_submissions_form_idx on public.form_submissions (form_id, created_at desc);
create index form_submissions_org_idx on public.form_submissions (org_id, created_at desc);
create index form_submissions_lead_idx on public.form_submissions (lead_id);

-- ---------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------
create or replace function private.random_slug(p_prefix text default '')
returns text language sql volatile set search_path = '' as $$
  select p_prefix || substr(md5(gen_random_uuid()::text), 1, 10)
$$;

-- Plan limit on active (non-archived) forms, checked on create and on
-- un-archive. Publishing requires a name field and a way to reply.
create or replace function private.form_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_count integer;
begin
  if tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  if new.status <> 'archived' and (tg_op = 'INSERT' or old.status = 'archived') then
    v_limit := (private.effective_plan(new.org_id)).max_forms;
    if v_limit is not null then
      perform 1 from public.organizations where id = new.org_id for update;
      select count(*) into v_count from public.forms
        where org_id = new.org_id and status <> 'archived' and id <> new.id;
      if v_count >= v_limit then
        raise exception 'خطتك الحالية تسمح بـ % نموذج نشط فقط. أرشف نموذجًا أو رقِّ الخطة.', v_limit
          using errcode = 'P0001', hint = 'plan_limit';
      end if;
    end if;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if tg_op = 'INSERT' then
      raise exception 'أضف الحقول أولًا ثم انشر النموذج' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.form_fields where form_id = new.id and maps_to = 'full_name') then
      raise exception 'لا يمكن النشر: أضف حقل الاسم وحدده كـ «الاسم الكامل»' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.form_fields where form_id = new.id and maps_to in ('email', 'phone') and required) then
      raise exception 'لا يمكن النشر: اجعل البريد أو الهاتف حقلًا مطلوبًا كي تتمكن من الرد' using errcode = 'P0001';
    end if;
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger forms_before_write before insert or update on public.forms
  for each row execute function private.form_before_write();

create or replace function private.form_field_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.type in ('select', 'radio') and cardinality(new.options) < 2 then
    raise exception 'أضف خيارين على الأقل لهذا الحقل' using errcode = '22023';
  end if;
  if new.type not in ('select', 'radio') then
    new.options := '{}';
  end if;
  if new.maps_to = 'email' and new.type <> 'email' then
    raise exception 'حقل البريد يجب أن يكون من نوع بريد إلكتروني' using errcode = '22023';
  end if;
  if new.maps_to = 'phone' and new.type <> 'phone' then
    raise exception 'حقل الهاتف يجب أن يكون من نوع هاتف' using errcode = '22023';
  end if;
  if new.maps_to = 'full_name' then
    if new.type <> 'text' then
      raise exception 'حقل الاسم يجب أن يكون نصًا قصيرًا' using errcode = '22023';
    end if;
    new.required := true;
  end if;
  if new.maps_to = 'needs' and new.type not in ('text', 'textarea', 'select', 'radio') then
    raise exception 'حقل الاحتياج يجب أن يكون نصًا أو اختيارًا' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger form_fields_before_write before insert or update on public.form_fields
  for each row execute function private.form_field_before_write();

create or replace function private.seed_default_fields(p_org uuid, p_form uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.form_fields (org_id, form_id, key, label, type, required, maps_to, position, placeholder) values
    (p_org, p_form, 'full_name', 'الاسم الكامل', 'text', true, 'full_name', 1, null),
    (p_org, p_form, 'phone', 'رقم الهاتف (واتساب)', 'phone', true, 'phone', 2, '+9665xxxxxxxx'),
    (p_org, p_form, 'email', 'البريد الإلكتروني', 'email', false, 'email', 3, null),
    (p_org, p_form, 'needs', 'كيف يمكننا مساعدتك؟', 'textarea', false, 'needs', 4, null)
$$;

-- Creates a form with sensible default fields (owner/admin only).
create or replace function public.create_form(p_org uuid, p_name text, p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not private.is_org_admin(p_org) then
    raise exception 'لا تملك صلاحية إنشاء النماذج' using errcode = '42501';
  end if;
  insert into public.forms (org_id, name, description, headline, slug, created_by)
  values (p_org, btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), btrim(p_name), private.random_slug('f'), auth.uid())
  returning id into v_id;
  perform private.seed_default_fields(p_org, v_id);
  perform private.audit(p_org, 'form.create', 'form', v_id);
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Public access (anon): definition of a published form, and submit.
-- ---------------------------------------------------------------------
create or replace function public.get_public_form(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', f.slug,
    'name', f.name,
    'headline', coalesce(f.headline, f.name),
    'description', f.description,
    'privacy_notice', f.privacy_notice,
    'consent_label', f.consent_label,
    'org_name', o.name,
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', ff.key, 'label', ff.label, 'type', ff.type, 'required', ff.required,
        'placeholder', ff.placeholder, 'help_text', ff.help_text, 'options', to_jsonb(ff.options)
      ) order by ff.position, ff.created_at)
      from public.form_fields ff where ff.form_id = f.id), '[]'::jsonb)
  )
  from public.forms f
  join public.organizations o on o.id = f.org_id
  where f.slug = p_slug and f.status = 'published'
$$;

create or replace function private.clean_text(p_value text, p_max integer)
returns text language sql immutable set search_path = '' as $$
  select nullif(left(btrim(regexp_replace(coalesce(p_value, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F]', '', 'g')), p_max), '')
$$;

-- Validates every answer against the form definition, then stores the
-- submission and creates the lead. Returns the form's success message.
-- p_client_key is an opaque hash of the visitor (computed by the server)
-- used only for rate limiting; it is not stored.
create or replace function public.submit_public_form(
  p_slug text,
  p_answers jsonb,
  p_consent boolean,
  p_meta jsonb default '{}'::jsonb,
  p_client_key text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_form public.forms;
  v_field record;
  v_raw jsonb;
  v_val text;
  v_clean jsonb := '{}'::jsonb;
  v_name text;
  v_email text;
  v_phone text;
  v_needs text;
  v_extra text[] := '{}';
  v_lead uuid;
  v_meta jsonb := case when jsonb_typeof(p_meta) = 'object' then p_meta else '{}'::jsonb end;
  v_answers jsonb := case when jsonb_typeof(p_answers) = 'object' then p_answers else '{}'::jsonb end;
begin
  select * into v_form from public.forms where slug = p_slug and status = 'published';
  if v_form.id is null then
    raise exception 'هذا النموذج غير متاح حاليًا' using errcode = 'P0002';
  end if;
  if not coalesce(p_consent, false) then
    raise exception 'يجب الموافقة على استخدام بياناتك لإرسال الطلب' using errcode = '22023';
  end if;
  -- Abuse limits: per visitor and per form (protects even direct API calls).
  if p_client_key is not null and not private.consume_rate_limit('form:' || v_form.id || ':' || left(p_client_key, 64), 5, 600) then
    raise exception 'أرسلت عدة طلبات خلال وقت قصير. حاول بعد قليل.' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  if not private.consume_rate_limit('form:' || v_form.id, 60, 600) then
    raise exception 'النموذج يستقبل عددًا كبيرًا من الطلبات الآن. حاول بعد دقائق.' using errcode = 'P0001', hint = 'rate_limit';
  end if;

  for v_field in select * from public.form_fields where form_id = v_form.id order by position, created_at loop
    v_raw := v_answers -> v_field.key;
    if v_field.type = 'checkbox' then
      v_val := case when v_raw in ('true'::jsonb, '"on"'::jsonb, '"true"'::jsonb) then 'نعم' else null end;
    else
      v_val := private.clean_text(v_raw #>> '{}', case when v_field.type = 'textarea' then 2000 else 300 end);
    end if;

    if v_val is null then
      if v_field.required then
        raise exception 'الحقل «%» مطلوب', v_field.label using errcode = '22023';
      end if;
      continue;
    end if;

    if v_field.type = 'email' then
      v_val := lower(v_val);
      if v_val !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or char_length(v_val) > 254 then
        raise exception 'البريد الإلكتروني في «%» غير صحيح', v_field.label using errcode = '22023';
      end if;
    elsif v_field.type = 'phone' then
      if v_val !~ '^\+?[0-9 ()-]{7,20}$' or char_length(regexp_replace(v_val, '[^0-9]', '', 'g')) not between 7 and 15 then
        raise exception 'رقم الهاتف في «%» غير صحيح', v_field.label using errcode = '22023';
      end if;
    elsif v_field.type = 'number' then
      if v_val !~ '^-?[0-9]{1,12}([.][0-9]{1,4})?$' then
        raise exception 'أدخل رقمًا صحيحًا في «%»', v_field.label using errcode = '22023';
      end if;
    elsif v_field.type = 'date' then
      if v_val !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        raise exception 'أدخل تاريخًا صحيحًا في «%»', v_field.label using errcode = '22023';
      end if;
    elsif v_field.type in ('select', 'radio') then
      if not (v_val = any (v_field.options)) then
        raise exception 'اختر قيمة من القائمة في «%»', v_field.label using errcode = '22023';
      end if;
    end if;

    v_clean := v_clean || jsonb_build_object(v_field.key, v_val);
    case v_field.maps_to
      when 'full_name' then v_name := v_val;
      when 'email' then v_email := v_val;
      when 'phone' then v_phone := v_val;
      when 'needs' then v_needs := v_val;
      else v_extra := v_extra || (v_field.label || ': ' || v_val);
    end case;
  end loop;

  if v_name is null or char_length(v_name) < 2 then
    raise exception 'اكتب الاسم (حرفان على الأقل)' using errcode = '22023';
  end if;
  if v_email is null and v_phone is null then
    raise exception 'أدخل وسيلة تواصل واحدة على الأقل' using errcode = '22023';
  end if;
  if cardinality(v_extra) > 0 then
    v_needs := left(concat_ws(E'\n', v_needs, array_to_string(v_extra, E'\n')), 4000);
  end if;

  insert into public.leads (org_id, full_name, email, phone, needs, source, utm_source, utm_medium, utm_campaign, referrer, form_id, consent_at)
  values (
    v_form.org_id, left(v_name, 120), v_email, left(v_phone, 32), v_needs,
    coalesce(private.clean_text(v_meta ->> 'utm_source', 100), v_form.source_label),
    private.clean_text(v_meta ->> 'utm_source', 100),
    private.clean_text(v_meta ->> 'utm_medium', 100),
    private.clean_text(v_meta ->> 'utm_campaign', 150),
    private.clean_text(v_meta ->> 'referrer', 500),
    v_form.id, now()
  ) returning id into v_lead;

  insert into public.form_submissions (org_id, form_id, lead_id, answers, consent_text, consent_at, utm_source, utm_medium, utm_campaign, referrer)
  values (v_form.org_id, v_form.id, v_lead, v_clean, v_form.consent_label, now(),
    private.clean_text(v_meta ->> 'utm_source', 100), private.clean_text(v_meta ->> 'utm_medium', 100),
    private.clean_text(v_meta ->> 'utm_campaign', 150), private.clean_text(v_meta ->> 'referrer', 500));

  insert into public.lead_activities (org_id, lead_id, kind, body, meta)
  values (v_form.org_id, v_lead, 'submission', null, jsonb_build_object('form_id', v_form.id, 'form_name', v_form.name));

  return jsonb_build_object('ok', true, 'message', v_form.success_message);
end $$;

-- ---------------------------------------------------------------------
-- RLS: members read, owners/admins configure. No direct writes to
-- submissions (they come from submit_public_form only).
-- ---------------------------------------------------------------------
alter table public.forms enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_submissions enable row level security;

create policy forms_select on public.forms for select to authenticated using (private.is_member(org_id));
create policy forms_update on public.forms for update to authenticated
  using (private.is_org_admin(org_id)) with check (private.is_org_admin(org_id));
create policy forms_delete on public.forms for delete to authenticated using (private.is_org_admin(org_id));

create policy form_fields_select on public.form_fields for select to authenticated using (private.is_member(org_id));
create policy form_fields_insert on public.form_fields for insert to authenticated with check (private.is_org_admin(org_id));
create policy form_fields_update on public.form_fields for update to authenticated
  using (private.is_org_admin(org_id)) with check (private.is_org_admin(org_id));
create policy form_fields_delete on public.form_fields for delete to authenticated using (private.is_org_admin(org_id));

create policy form_submissions_select on public.form_submissions for select to authenticated using (private.is_member(org_id));

revoke all on public.forms, public.form_fields, public.form_submissions from anon;
-- Forms are created by create_form() (default fields + audit).
revoke insert on public.forms from authenticated;
revoke insert, update, delete on public.form_submissions from authenticated;
