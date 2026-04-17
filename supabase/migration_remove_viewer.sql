-- =========================================================
-- Migration: Xóa role 'viewer' — chỉ giữ admin + staff
-- visibility_rules thay thế hoàn toàn chức năng viewer
-- Chạy trên Supabase SQL Editor
-- =========================================================

-- 1. Chuyển viewer thành staff + thêm visibility_rules cho tất cả user hiện tại
--    (vì viewer trước đó thấy tất cả, giờ cần visibility_rules tương đương)
do $$
declare
  v record;
  t record;
begin
  for v in select id from public.profiles where role = 'viewer' loop
    -- Thêm visibility_rules: viewer cũ thấy tất cả user khác
    for t in select id from public.profiles where id <> v.id loop
      insert into public.visibility_rules (viewer_id, target_id)
      values (v.id, t.id)
      on conflict do nothing;
    end loop;
    -- Bật auto_see_new_users để tự động thấy user mới
    update public.profiles set auto_see_new_users = true where id = v.id;
    -- Đổi role sang staff
    update public.profiles set role = 'staff' where id = v.id;
  end loop;
end;
$$;

-- 2. Cập nhật CHECK constraint: chỉ cho phép admin và staff
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','staff'));

-- 3. Cập nhật can_see_all() — chỉ admin
create or replace function public.can_see_all() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
