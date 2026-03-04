alter table if exists public.profiles
  add column if not exists ui_settings jsonb not null default '{}'::jsonb;

alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_editor_admin_read_all" on public.profiles;
create policy "profiles_editor_admin_read_all"
on public.profiles
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "profiles_editor_admin_update_any" on public.profiles;
create policy "profiles_editor_admin_update_any"
on public.profiles
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles
for delete
to authenticated
using (public.is_admin());

