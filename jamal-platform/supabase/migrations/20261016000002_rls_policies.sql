-- =====================================================================
-- Row Level Security
--
-- The application server talks to Postgres in three modes:
--   * anon           — public catalog reads           (role: anon)
--   * authenticated  — customer & admin requests      (role: authenticated + JWT sub)
--   * system         — trusted server operations      (table owner, e.g. creating
--                      an order with server-computed prices)
-- Customer and admin requests therefore go through these policies, so admin
-- access is enforced by the database (is_admin()) and not only by the UI.
-- The same policies protect the tables if the Supabase anon key is ever used
-- directly from a browser through PostgREST.
-- =====================================================================

-- Enable RLS on every table.
alter table public.profiles            enable row level security;
alter table public.currencies          enable row level security;
alter table public.countries           enable row level security;
alter table public.shipping_zones      enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.suppliers           enable row level security;
alter table public.supplier_products   enable row level security;
alter table public.favorites           enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.fulfillment_records enable row level security;
alter table public.order_item_costs    enable row level security;
alter table public.order_events        enable row level security;
alter table public.return_requests     enable row level security;
alter table public.store_settings      enable row level security;
alter table public.pages               enable row level security;
alter table public.contact_messages    enable row level security;
alter table public.audit_log           enable row level security;

-- ---------------------------------------------------------------------
-- Table privileges (RLS still applies on top of these).
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.currencies, public.countries, public.shipping_zones,
  public.categories, public.products, public.product_variants,
  public.store_settings, public.pages to anon, authenticated;
grant insert, update, delete on public.currencies, public.countries, public.shipping_zones,
  public.categories, public.products, public.product_variants,
  public.store_settings, public.pages to authenticated;
grant select, insert, update, delete on public.suppliers, public.supplier_products,
  public.favorites, public.fulfillment_records, public.order_item_costs,
  public.contact_messages to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select, insert on public.order_events to authenticated;
grant select, insert, update on public.return_requests to authenticated;
grant select, insert on public.audit_log to authenticated;
grant select on public.profiles to authenticated;

-- Customers may edit only their name and phone — never their role.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Anonymous visitors cannot write anything directly.
revoke insert, update, delete on all tables in schema public from anon;
-- Orders are created only by the server (prices are computed server-side).
revoke insert, delete on public.orders, public.order_items from anon, authenticated;
revoke update, delete on public.audit_log from anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Role changes go through this function only (admins only, cannot demote self).
create or replace function public.admin_set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if new_role not in ('customer', 'admin') then
    raise exception 'invalid role';
  end if;
  if target = auth.uid() and new_role <> 'admin' then
    raise exception 'cannot demote yourself';
  end if;
  update public.profiles set role = new_role where id = target;
end $$;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Reference data: public read of active rows, admin write.
-- ---------------------------------------------------------------------
create policy currencies_read on public.currencies for select to anon, authenticated
  using (is_active or public.is_admin());
create policy currencies_admin on public.currencies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy countries_read on public.countries for select to anon, authenticated
  using (is_active or public.is_admin());
create policy countries_admin on public.countries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy shipping_zones_read on public.shipping_zones for select to anon, authenticated
  using (is_active or public.is_admin());
create policy shipping_zones_admin on public.shipping_zones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or public.is_admin());
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Products: customers see published products only.
-- ---------------------------------------------------------------------
create policy products_read on public.products for select to anon, authenticated
  using (status = 'published' or public.is_admin());
create policy products_admin on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy product_variants_read on public.product_variants for select to anon, authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.status = 'published'
    )
  );
create policy product_variants_admin on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Internal tables: admins only.
-- ---------------------------------------------------------------------
create policy suppliers_admin on public.suppliers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy supplier_products_admin on public.supplier_products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy fulfillment_admin on public.fulfillment_records for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy order_item_costs_admin on public.order_item_costs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy contact_messages_admin on public.contact_messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy audit_log_read on public.audit_log for select to authenticated
  using (public.is_admin());
create policy audit_log_insert on public.audit_log for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());

-- ---------------------------------------------------------------------
-- Favorites: owner only.
-- ---------------------------------------------------------------------
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Orders: customers read their own; only admins update.
-- ---------------------------------------------------------------------
create policy orders_select on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy orders_admin_update on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy order_items_select on public.order_items for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

create policy order_events_select on public.order_events for select to authenticated
  using (
    public.is_admin() or (
      visible_to_customer and exists (
        select 1 from public.orders o where o.id = order_events.order_id and o.user_id = auth.uid()
      )
    )
  );
create policy order_events_admin_insert on public.order_events for insert to authenticated
  with check (public.is_admin());

create policy return_requests_select on public.return_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy return_requests_insert_own on public.return_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'requested'
    and refund_amount is null
    and admin_notes is null
    and exists (
      select 1 from public.orders o
      where o.id = return_requests.order_id and o.user_id = auth.uid() and o.status = 'delivered'
    )
  );
create policy return_requests_admin_update on public.return_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Shipment info a customer may see for their own order (no costs).
create or replace function public.order_shipments(p_order_id uuid)
returns table (status text, carrier text, tracking_number text, tracking_url text, shipped_at timestamptz, delivered_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.status, f.carrier, f.tracking_number, f.tracking_url, f.shipped_at, f.delivered_at
  from public.fulfillment_records f
  join public.orders o on o.id = f.order_id
  where f.order_id = p_order_id
    and f.status <> 'cancelled'
    and (o.user_id = auth.uid() or public.is_admin())
$$;
revoke execute on function public.order_shipments(uuid) from public, anon;
grant execute on function public.order_shipments(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Settings & pages
-- ---------------------------------------------------------------------
create policy store_settings_read on public.store_settings for select to anon, authenticated
  using (true);
create policy store_settings_admin on public.store_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy pages_read on public.pages for select to anon, authenticated
  using (is_published or public.is_admin());
create policy pages_admin on public.pages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
