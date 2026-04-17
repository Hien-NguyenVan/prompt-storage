-- =========================================================
-- Prompt Storage — Schema + RLS
-- Run in Supabase SQL Editor
-- =========================================================

-- Enable UUID
create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null check (role in ('admin','staff')) default 'staff',
  created_at timestamptz not null default now()
);

-- ---------- prompt_sets ----------
create table if not exists public.prompt_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_prompt_sets_created_by on public.prompt_sets(created_by);
create index if not exists idx_prompt_sets_created_at on public.prompt_sets(created_at desc);

-- ---------- image_refs (kho dùng chung trong bộ) ----------
create table if not exists public.image_refs (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.prompt_sets(id) on delete cascade,
  name text not null,
  prompt_text text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_image_refs_set on public.image_refs(set_id);

-- ---------- sub_videos ----------
create table if not exists public.sub_videos (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.prompt_sets(id) on delete cascade,
  order_index int not null,
  type text not null check (type in ('t2v','i2v_multiref','i2v_firstlast')),
  video_prompt text not null,
  -- for i2v_multiref: optional reference to another sub_video in same set by order_index
  video_ref_source_order int,
  created_at timestamptz not null default now()
);
create index if not exists idx_sub_videos_set on public.sub_videos(set_id, order_index);

-- ---------- sub_video_image_refs (N:N for multi ref) ----------
create table if not exists public.sub_video_image_refs (
  sub_video_id uuid not null references public.sub_videos(id) on delete cascade,
  image_ref_id uuid not null references public.image_refs(id) on delete cascade,
  primary key (sub_video_id, image_ref_id)
);

-- ---------- sub_video_frame_refs (for first&last) ----------
create table if not exists public.sub_video_frame_refs (
  id uuid primary key default gen_random_uuid(),
  sub_video_id uuid not null references public.sub_videos(id) on delete cascade,
  position text not null check (position in ('first','last')),
  image_ref_id uuid references public.image_refs(id) on delete cascade,
  source_video_order int,
  unique (sub_video_id, position),
  check (
    (image_ref_id is not null and source_video_order is null)
    or (image_ref_id is null and source_video_order is not null)
  )
);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_sets_updated on public.prompt_sets;
create trigger trg_sets_updated before update on public.prompt_sets
  for each row execute function public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================
alter table public.profiles enable row level security;
alter table public.prompt_sets enable row level security;
alter table public.image_refs enable row level security;
alter table public.sub_videos enable row level security;
alter table public.sub_video_image_refs enable row level security;
alter table public.sub_video_frame_refs enable row level security;

-- helper: is_admin()
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- helper: can_see_all() — admin only
create or replace function public.can_see_all() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---- profiles ----
drop policy if exists p_profiles_select on public.profiles;
create policy p_profiles_select on public.profiles for select
  using (id = auth.uid() or public.can_see_all());

drop policy if exists p_profiles_update_self on public.profiles;
create policy p_profiles_update_self on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- ---- prompt_sets ----
drop policy if exists p_sets_select on public.prompt_sets;
create policy p_sets_select on public.prompt_sets for select
  using (created_by = auth.uid() or public.can_see_all());

drop policy if exists p_sets_insert on public.prompt_sets;
create policy p_sets_insert on public.prompt_sets for insert
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists p_sets_update on public.prompt_sets;
create policy p_sets_update on public.prompt_sets for update
  using (created_by = auth.uid() or public.is_admin());

drop policy if exists p_sets_delete on public.prompt_sets;
create policy p_sets_delete on public.prompt_sets for delete
  using (public.is_admin());

-- ---- image_refs ----
drop policy if exists p_refs_all on public.image_refs;
drop policy if exists p_refs_select on public.image_refs;
drop policy if exists p_refs_write on public.image_refs;
create policy p_refs_select on public.image_refs for select
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.can_see_all())));
create policy p_refs_write on public.image_refs for all
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.is_admin())));

-- ---- sub_videos ----
drop policy if exists p_sub_all on public.sub_videos;
drop policy if exists p_sub_select on public.sub_videos;
drop policy if exists p_sub_write on public.sub_videos;
create policy p_sub_select on public.sub_videos for select
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.can_see_all())));
create policy p_sub_write on public.sub_videos for all
  using (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.prompt_sets s where s.id = set_id and (s.created_by = auth.uid() or public.is_admin())));

-- ---- sub_video_image_refs ----
drop policy if exists p_svir_all on public.sub_video_image_refs;
drop policy if exists p_svir_select on public.sub_video_image_refs;
drop policy if exists p_svir_write on public.sub_video_image_refs;
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

-- ---- sub_video_frame_refs ----
drop policy if exists p_svfr_all on public.sub_video_frame_refs;
drop policy if exists p_svfr_select on public.sub_video_frame_refs;
drop policy if exists p_svfr_write on public.sub_video_frame_refs;
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

-- =========================================================
-- Auto-create profile when a new auth user is created
-- =========================================================
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
  return new;
end;
$$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
