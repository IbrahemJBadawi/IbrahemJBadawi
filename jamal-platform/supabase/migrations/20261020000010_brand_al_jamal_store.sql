-- The platform is called «Al JAMAL Store | متجر الجمال».
alter table public.store_settings alter column store_name_ar set default 'متجر الجمال';
alter table public.store_settings alter column store_name_en set default 'Al JAMAL Store';
update public.store_settings set store_name_ar = 'متجر الجمال' where store_name_ar = 'منصة الجمال';
update public.store_settings set store_name_en = 'Al JAMAL Store' where store_name_en in ('JAMAL', 'Al Jamal');
update public.pages set title_ar = replace(title_ar, 'منصة الجمال', 'متجر الجمال'), body_ar = replace(body_ar, 'منصة الجمال', 'متجر الجمال')
  where title_ar like '%منصة الجمال%' or body_ar like '%منصة الجمال%';
