-- اختبارات الصلاحيات وسياسات RLS. أي فشل يرفع استثناء ويوقف التنفيذ (ON_ERROR_STOP).
\set ON_ERROR_STOP on

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test', '{"display_name":"مدير"}'),
  ('00000000-0000-0000-0000-00000000000b', 'alice@example.test', '{"display_name":"علياء"}'),
  ('00000000-0000-0000-0000-00000000000c', 'bob@example.test', '{}');

-- الملفات أُنشئت تلقائيًا بدور user
do $$ begin
  assert (select count(*) from public.profiles where role = 'user') = 3, 'profiles not auto-created';
  assert (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') = 'علياء';
end $$;

-- ترقية المدير عبر SQL المباشر (كما في SQL Editor)
select public.promote_to_admin('admin@example.test');

-- ═════ مستخدم عادي (alice) ═════
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

-- يرى ملفه فقط
do $$ begin
  assert (select count(*) from public.profiles) = 1, 'user sees other profiles';
end $$;

-- لا يستطيع ترقية نفسه
do $$ begin
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'ESCALATION_ALLOWED';
  exception when others then
    if sqlerrm = 'ESCALATION_ALLOWED' then raise; end if;
  end;
end $$;

-- يستطيع تعديل اسمه
update public.profiles set display_name = 'علياء أحمد' where id = auth.uid();

-- لا يستطيع تعديل ملف غيره (لا صفوف متأثرة)
do $$ declare n int; begin
  update public.profiles set display_name = 'x' where id = '00000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  assert n = 0, 'user updated another profile';
end $$;

-- وثائقه الشخصية
insert into public.user_documents (user_id, key, data) values (auth.uid(), 'bookmarks', '{"a":1}');
insert into public.user_documents (user_id, key, data) values (auth.uid(), 'readingLog', '{}')
  on conflict (user_id, key) do update set data = excluded.data;

-- لا يستطيع الكتابة باسم غيره
do $$ begin
  begin
    insert into public.user_documents (user_id, key, data) values ('00000000-0000-0000-0000-00000000000c', 'bookmarks', '{}');
    raise exception 'FOREIGN_WRITE_ALLOWED';
  exception when others then
    if sqlerrm = 'FOREIGN_WRITE_ALLOWED' then raise; end if;
  end;
end $$;

-- مفتاح غير مسموح
do $$ begin
  begin
    insert into public.user_documents (user_id, key, data) values (auth.uid(), 'password', '{}');
    raise exception 'BAD_KEY_ALLOWED';
  exception when others then
    if sqlerrm = 'BAD_KEY_ALLOWED' then raise; end if;
  end;
end $$;

-- لا يستطيع تعديل المحتوى العام
do $$ begin
  begin
    insert into public.adhkar_categories (id, title) values ('hack', 'x');
    raise exception 'CONTENT_WRITE_ALLOWED';
  exception when others then
    if sqlerrm = 'CONTENT_WRITE_ALLOWED' then raise; end if;
  end;
end $$;

-- لا يستطيع استدعاء الدوال الإدارية
do $$ begin
  begin
    perform public.admin_list_users();
    raise exception 'ADMIN_FN_ALLOWED';
  exception when others then
    if sqlerrm = 'ADMIN_FN_ALLOWED' then raise; end if;
  end;
  begin
    perform public.admin_set_role('00000000-0000-0000-0000-00000000000b', 'admin');
    raise exception 'ADMIN_FN_ALLOWED';
  exception when others then
    if sqlerrm = 'ADMIN_FN_ALLOWED' then raise; end if;
  end;
  begin
    perform public.promote_to_admin('alice@example.test');
    raise exception 'PROMOTE_ALLOWED';
  exception when others then
    if sqlerrm = 'PROMOTE_ALLOWED' then raise; end if;
  end;
end $$;

-- يستطيع تسجيل خطأ لكن لا يقرأ السجل
insert into public.error_logs (message) values ('test error');
do $$ begin
  assert (select count(*) from public.error_logs) = 0, 'user can read error logs';
end $$;

-- ═════ مستخدم آخر (bob) لا يرى وثائق alice ═════
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.user_documents) = 0, 'bob sees alice documents';
end $$;
do $$ declare n int; begin
  delete from public.user_documents where user_id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'bob deleted alice documents';
end $$;

-- ═════ زائر (anon) ═════
reset role;
reset request.jwt.claim.sub;
\i supabase/seed.sql
-- لحظة مسودة ولحظة مجدولة مستقبلًا لاختبار الإخفاء
insert into public.oasis_moments (id, surah, ayah_from, ayah_to, status) values ('draft-1', 1, 1, 1, 'draft');
insert into public.oasis_moments (id, surah, ayah_from, ayah_to, status, publish_date)
  values ('future-1', 1, 2, 2, 'published', current_date + 30);
update public.adhkar set active = false where id = 'd-hawqala';

set role anon;
do $$ begin
  assert (select count(*) from public.adhkar) = 63, 'anon adhkar count (inactive hidden)';
  assert (select count(*) from public.oasis_moments) = 20, 'anon should not see drafts/future moments';
  assert (select count(*) from public.lessons) > 0, 'anon cannot read lessons';
  assert (select count(*) from public.user_documents) = 0, 'anon sees user docs';
  assert (select count(*) from public.profiles) = 0, 'anon sees profiles';
end $$;
-- التحديث من زائر يُرشَّح بصمت بواسطة RLS (0 صفوف)
do $$ declare n int; begin
  update public.adhkar set body = 'x' where id = 'm-subhan';
  get diagnostics n = row_count;
  assert n = 0, 'anon updated content';
exception when insufficient_privilege then null;
end $$;
insert into public.error_logs (message) values ('anon error');

-- ═════ المدير ═════
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.profiles) = 3, 'admin sees all profiles';
  assert (select count(*) from public.admin_list_users()) = 3, 'admin_list_users';
  assert (select count(*) from public.error_logs) = 2, 'admin reads error logs';
  assert (select count(*) from public.oasis_moments) = 22, 'staff sees drafts';
  -- المدير لا يقرأ البيانات الشخصية للمستخدمين
  assert (select count(*) from public.user_documents) = 0, 'admin reads personal documents';
  assert ((public.admin_stats())::jsonb ->> 'users_total')::int = 3, 'admin_stats';
end $$;
select public.admin_set_role('00000000-0000-0000-0000-00000000000c', 'editor');
update public.adhkar set note = 'تمت المراجعة' where id = 'm-subhan';

-- لا يمكن إزالة آخر مدير
do $$ begin
  begin
    perform public.admin_set_role('00000000-0000-0000-0000-00000000000a', 'user');
    raise exception 'LAST_ADMIN_REMOVED';
  exception when others then
    if sqlerrm = 'LAST_ADMIN_REMOVED' then raise; end if;
  end;
end $$;

-- ═════ المحرر (bob): يدير المحتوى ولا يدير المستخدمين ═════
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into public.oasis_moments (id, surah, ayah_from, ayah_to, status, meaning, meaning_source)
  values ('editor-1', 2, 255, 255, 'draft', 'معنى', 'التفسير الميسر');
do $$ begin
  begin
    perform public.admin_list_users();
    raise exception 'EDITOR_LISTED_USERS';
  exception when others then
    if sqlerrm = 'EDITOR_LISTED_USERS' then raise; end if;
  end;
  assert (select count(*) from public.profiles) = 1, 'editor sees other profiles';
end $$;
-- معنى بلا مصدر مرفوض
do $$ begin
  begin
    insert into public.oasis_moments (surah, ayah_from, ayah_to, meaning) values (2, 1, 1, 'بدون مصدر');
    raise exception 'UNSOURCED_ALLOWED';
  exception when others then
    if sqlerrm = 'UNSOURCED_ALLOWED' then raise; end if;
  end;
end $$;

-- ═════ حذف الحساب (alice) ═════
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.delete_my_account();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000b'), 'user not deleted';
  assert not exists (select 1 from public.user_documents where user_id = '00000000-0000-0000-0000-00000000000b'), 'documents not cascaded';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'profile not cascaded';
end $$;

select 'ALL RLS TESTS PASSED' as result;
