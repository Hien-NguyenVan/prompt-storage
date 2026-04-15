-- =========================================================
-- Migration: thêm role 'viewer' — xem tất cả, không sửa/xóa của ai, không quản lý user
-- Chạy trên Supabase SQL Editor
-- =========================================================

-- 1. Mở rộng check constraint
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','staff','viewer'));

-- 2. Helper: role có quyền xem toàn bộ (admin hoặc viewer)
create or replace function public.can_see_all() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','viewer'));
$$;

-- 3. Update SELECT policies
drop policy if exists p_profiles_select on public.profiles;
create policy p_profiles_select on public.profiles for select
  using (id = auth.uid() or public.can_see_all());

drop policy if exists p_sets_select on public.prompt_sets;
create policy p_sets_select on public.prompt_sets for select
  using (created_by = auth.uid() or public.can_see_all());

-- 4. Tách policy cho image_refs / sub_videos / svir / svfr:
--    SELECT cho phép viewer; INSERT/UPDATE/DELETE chỉ owner + admin
drop policy if exists p_refs_all on public.image_refs;
create policy p_refs_select on public.image_refs for select
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.can_see_all())));
create policy p_refs_write on public.image_refs for all
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.is_admin())));

drop policy if exists p_sub_all on public.sub_videos;
create policy p_sub_select on public.sub_videos for select
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.can_see_all())));
create policy p_sub_write on public.sub_videos for all
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.is_admin())));

drop policy if exists p_svir_all on public.sub_video_image_refs;
create policy p_svir_select on public.sub_video_image_refs for select
  using (exists (
    select 1 from public.sub_videos sv join public.prompt_sets s on s.id = sv.set_id
    where sv.id = sub_video_id and (s.created_by = auth.uid() or public.can_see_all())
  ));
create policy p_svir_write on public.sub_video_image_refs for all
  using (exists (
    select 1 from public.sub_videos sv join public.prompt_sets s on s.id = sv.set_id
    where sv.id = sub_video_id and (s.created_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.sub_videos sv join public.prompt_sets s on s.id = sv.set_id
    where sv.id = sub_video_id and (s.created_by = auth.uid() or public.is_admin())
  ));

drop policy if exists p_svfr_all on public.sub_video_frame_refs;
create policy p_svfr_select on public.sub_video_frame_refs for select
  using (exists (
    select 1 from public.sub_videos sv join public.prompt_sets s on s.id = sv.set_id
    where sv.id = sub_video_id and (s.created_by = auth.uid() or public.can_see_all())
  ));
create policy p_svfr_write on public.sub_video_frame_refs for all
  using (exists (
    select 1 from public.sub_videos sv join public.prompt_sets s on s.id = sv.set_id
    where sv.id = sub_video_id and (s.created_by = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.sub_videos sv join public.prompt_sets s on s.id = sv.set_id
    where sv.id = sub_video_id and (s.created_by = auth.uid() or public.is_admin())
  ));

-- prompt_sets: INSERT/UPDATE/DELETE policies giữ nguyên (đã có sẵn)
-- chỉ cần đảm bảo viewer KHÔNG được insert/update/delete → đã đúng
-- (policy p_sets_insert yêu cầu created_by = auth.uid() or is_admin; viewer sẽ fail)
