-- Promote the admin user after creating the auth user
-- Step 1: In Supabase Dashboard → Authentication → Users → "Add user"
--   Email: nvhien.it.work@gmail.com
--   Password: 123123
--   Auto Confirm User: YES
-- Step 2: Run this SQL

update public.profiles
set role = 'admin', full_name = 'Admin'
where email = 'nvhien.it.work@gmail.com';

select id, email, role from public.profiles where email = 'nvhien.it.work@gmail.com';
