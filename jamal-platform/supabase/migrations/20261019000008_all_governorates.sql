-- =====================================================================
-- Deliver to every Palestinian governorate, Gaza Strip included.
-- Areas without a fee set by the admin take orders with the delivery fee
-- confirmed together with the final price (before any payment), which is
-- how every order is already approved. Nothing is charged automatically.
-- =====================================================================
alter table public.shipping_zones
  add column if not exists fee_on_confirmation boolean not null default false;

insert into public.shipping_zones (country_code, currency_code, governorate_id, name_ar, rate, min_days, max_days,
  cod_available, is_active, fee_on_confirmation)
select 'PS', 'ILS', g.id, g.name_ar, 0, 2, 5, false, true, true
from public.governorates g
where g.country_code = 'PS'
  and not exists (
    select 1 from public.shipping_zones z
    where z.country_code = 'PS' and z.currency_code = 'ILS' and z.governorate_id = g.id
  );

-- An admin entering a fee turns the "to confirm" flag off.
create or replace function public.trg_zone_fee_set() returns trigger
language plpgsql as $$
begin
  if new.rate is distinct from old.rate and new.rate > 0 then new.fee_on_confirmation := false; end if;
  return new;
end $$;
create trigger shipping_zones_fee_set before update on public.shipping_zones
  for each row execute function public.trg_zone_fee_set();
