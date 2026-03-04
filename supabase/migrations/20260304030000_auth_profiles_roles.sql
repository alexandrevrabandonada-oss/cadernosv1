do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'editor', 'viewer');
  end if;
end $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_profile_updated_at();

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role::text from public.profiles p where p.user_id = auth.uid()), 'viewer');
$$;

create or replace function public.can_write()
returns boolean
language sql
stable
as $$
  select public.current_profile_role() in ('admin', 'editor');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_profile_role() = 'admin';
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles
for delete
to authenticated
using (public.is_admin());

do $$
declare
  t text;
  tbl text[] := array[
    'universes',
    'nodes',
    'edges',
    'documents',
    'chunks',
    'qa_threads',
    'citations',
    'evidences',
    'trails',
    'trail_steps',
    'tutor_modules',
    'tutor_steps',
    'events',
    'ingest_logs',
    'qa_logs'
  ];
begin
  foreach t in array tbl loop
    execute format('drop policy if exists "%s_write_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_write_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_write_delete" on public.%I', t, t);

    execute format('create policy "%s_write_insert" on public.%I for insert to authenticated with check (public.can_write())', t, t);
    execute format('create policy "%s_write_update" on public.%I for update to authenticated using (public.can_write()) with check (public.can_write())', t, t);
    execute format('create policy "%s_write_delete" on public.%I for delete to authenticated using (public.can_write())', t, t);
  end loop;
end $$;
