-- =========================================================
-- Migration: Visibility rules — admin quyết định ai thấy ai
-- Chạy trên Supabase SQL Editor
-- =========================================================

-- 1. Bảng quy tắc: viewer_id thấy được prompt của target_id
create table if not exists public.visibility_rules (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  primary key (viewer_id, target_id)
);

-- 2. Cột "tự động thấy user mới" trên profiles
alter table public.profiles add column if not exists auto_see_new_users boolean not null default false;

-- 3. Helper: user hiện tại có quyền xem prompt của target không
create or replace function public.can_view_user(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    target = auth.uid()
    or public.can_see_all()
    or exists (select 1 from public.visibility_rules where viewer_id = auth.uid() and target_id = target);
$$;

-- 4. Cập nhật SELECT policies dùng can_view_user
drop policy if exists p_sets_select on public.prompt_sets;
create policy p_sets_select on public.prompt_sets for select
  using (public.can_view_user(created_by));

drop policy if exists p_refs_select on public.image_refs;
create policy p_refs_select on public.image_refs for select
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and public.can_view_user(s.created_by)));

drop policy if exists p_sub_select on public.sub_videos;
create policy p_sub_select on public.sub_videos for select
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and public.can_view_user(s.created_by)));

drop policy if exists p_svir_select on public.sub_video_image_refs;
create policy p_svir_select on public.sub_video_image_refs for select
  using (exists (
    select 1 from public.sub_videos sv join public.prompt_sets s on s.id = sv.set_id
    where sv.id = sub_video_id and public.can_view_user(s.created_by)
  ));

drop policy if exists p_svfr_select on public.sub_video_frame_refs;
create policy p_svfr_select on public.sub_video_frame_refs for select
  using (exists (
    select 1 from public.sub_videos sv join public.prompt_sets s on s.id = sv.set_id
    where sv.id = sub_video_id and public.can_view_user(s.created_by)
  ));

-- 5. RLS cho visibility_rules
alter table public.visibility_rules enable row level security;

-- Admin đọc/ghi tất cả
drop policy if exists p_vr_admin on public.visibility_rules;
create policy p_vr_admin on public.visibility_rules for all
  using (public.is_admin())
  with check (public.is_admin());

-- User đọc rules của chính mình (để client biết mình thấy ai)
drop policy if exists p_vr_read_self on public.visibility_rules;
create policy p_vr_read_self on public.visibility_rules for select
  using (viewer_id = auth.uid());

-- 6. Cập nhật trigger tạo user mới: auto thêm visibility rules
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  )
  on conflict (id) do nothing;

  -- Ai có auto_see_new_users = true → tự thấy user mới
  insert into public.visibility_rules (viewer_id, target_id)
  select p.id, new.id from public.profiles p
  where p.auto_see_new_users = true and p.id <> new.id
  on conflict do nothing;

  -- Nếu metadata yêu cầu user mới thấy tất cả hiện tại
  if (new.raw_user_meta_data->>'see_all_existing')::boolean = true then
    insert into public.visibility_rules (viewer_id, target_id)
    select new.id, p.id from public.profiles p where p.id <> new.id
    on conflict do nothing;
  end if;

  -- Nếu metadata yêu cầu tất cả hiện tại thấy user mới
  if (new.raw_user_meta_data->>'visible_to_all')::boolean = true then
    insert into public.visibility_rules (viewer_id, target_id)
    select p.id, new.id from public.profiles p where p.id <> new.id
    on conflict do nothing;
  end if;

  return new;
end;
$$;
