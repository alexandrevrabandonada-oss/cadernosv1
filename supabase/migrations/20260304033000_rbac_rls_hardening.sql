-- 1) Profiles shape compatibility (id/email/role text)
alter table if exists public.profiles add column if not exists id uuid;
alter table if exists public.profiles add column if not exists email text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
  ) then
    execute 'update public.profiles set id = coalesce(id, user_id)';
  end if;
end $$;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role' and udt_name = 'app_role'
  ) then
    alter table public.profiles alter column role type text using role::text;
  end if;
end $$;

alter table public.profiles alter column id set not null;
alter table public.profiles alter column role set default 'viewer';
alter table public.profiles alter column role set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('admin', 'editor', 'viewer'));
  end if;
end $$;

do $$
declare
  c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'p'
  limit 1;

  if c is not null then
    execute format('alter table public.profiles drop constraint %I', c);
  end if;
end $$;

alter table public.profiles add primary key (id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- 2) updated_at helper + trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 3) signup trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, created_at, updated_at)
  values (new.id, new.email, 'viewer', now(), now())
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 4) RBAC helper functions
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'viewer');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'editor')
  );
$$;

create or replace function public.can_write()
returns boolean
language sql
stable
as $$
  select public.is_editor_or_admin();
$$;

-- 5) RLS: enable + authenticated read policies
alter table public.universes enable row level security;

drop policy if exists "universes_authenticated_read_all" on public.universes;
create policy "universes_authenticated_read_all"
on public.universes
for select
to authenticated
using (true);

do $$
declare
  t text;
  tbl text[] := array[
    'nodes',
    'edges',
    'documents',
    'chunks',
    'evidences',
    'trails',
    'trail_steps',
    'tutor_modules',
    'tutor_steps',
    'events',
    'qa_threads',
    'citations'
  ];
begin
  foreach t in array tbl loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_authenticated_read_all" on public.%I', t, t);
    execute format('create policy "%s_authenticated_read_all" on public.%I for select to authenticated using (true)', t, t);
  end loop;
end $$;

-- 6) Editor/admin writes for content tables
do $$
declare
  t text;
  tbl text[] := array[
    'universes',
    'nodes',
    'edges',
    'documents',
    'chunks',
    'evidences',
    'trails',
    'trail_steps',
    'tutor_modules',
    'tutor_steps',
    'events'
  ];
begin
  foreach t in array tbl loop
    execute format('drop policy if exists "%s_editor_admin_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_editor_admin_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_editor_admin_delete" on public.%I', t, t);
    execute format('create policy "%s_editor_admin_insert" on public.%I for insert to authenticated with check (public.is_editor_or_admin())', t, t);
    execute format('create policy "%s_editor_admin_update" on public.%I for update to authenticated using (public.is_editor_or_admin()) with check (public.is_editor_or_admin())', t, t);
    execute format('create policy "%s_editor_admin_delete" on public.%I for delete to authenticated using (public.is_editor_or_admin())', t, t);
  end loop;
end $$;

-- 7) QA tables: only server role inserts; editor/admin may update/delete
drop policy if exists "qa_threads_write_insert" on public.qa_threads;
drop policy if exists "qa_threads_write_update" on public.qa_threads;
drop policy if exists "qa_threads_write_delete" on public.qa_threads;
drop policy if exists "qa_threads_admin_insert" on public.qa_threads;
drop policy if exists "qa_threads_admin_update" on public.qa_threads;
drop policy if exists "qa_threads_admin_delete" on public.qa_threads;
drop policy if exists "qa_threads_editor_admin_insert" on public.qa_threads;
drop policy if exists "qa_threads_editor_admin_update" on public.qa_threads;
drop policy if exists "qa_threads_editor_admin_delete" on public.qa_threads;

drop policy if exists "citations_write_insert" on public.citations;
drop policy if exists "citations_write_update" on public.citations;
drop policy if exists "citations_write_delete" on public.citations;
drop policy if exists "citations_admin_insert" on public.citations;
drop policy if exists "citations_admin_update" on public.citations;
drop policy if exists "citations_admin_delete" on public.citations;
drop policy if exists "citations_editor_admin_insert" on public.citations;
drop policy if exists "citations_editor_admin_update" on public.citations;
drop policy if exists "citations_editor_admin_delete" on public.citations;
drop policy if exists "qa_threads_service_insert" on public.qa_threads;
drop policy if exists "qa_threads_editor_admin_update" on public.qa_threads;
drop policy if exists "qa_threads_editor_admin_delete" on public.qa_threads;
drop policy if exists "citations_service_insert" on public.citations;
drop policy if exists "citations_editor_admin_update" on public.citations;
drop policy if exists "citations_editor_admin_delete" on public.citations;

create policy "qa_threads_service_insert"
on public.qa_threads
for insert
to service_role
with check (true);

create policy "qa_threads_editor_admin_update"
on public.qa_threads
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

create policy "qa_threads_editor_admin_delete"
on public.qa_threads
for delete
to authenticated
using (public.is_editor_or_admin());

create policy "citations_service_insert"
on public.citations
for insert
to service_role
with check (true);

create policy "citations_editor_admin_update"
on public.citations
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

create policy "citations_editor_admin_delete"
on public.citations
for delete
to authenticated
using (public.is_editor_or_admin());

-- 8) Logs: select only editor/admin, insert only service role
alter table public.qa_logs enable row level security;
alter table public.ingest_logs enable row level security;

drop policy if exists "qa_logs_write_insert" on public.qa_logs;
drop policy if exists "qa_logs_write_update" on public.qa_logs;
drop policy if exists "qa_logs_write_delete" on public.qa_logs;
drop policy if exists "qa_logs_admin_insert" on public.qa_logs;
drop policy if exists "qa_logs_admin_update" on public.qa_logs;
drop policy if exists "qa_logs_admin_delete" on public.qa_logs;
drop policy if exists "qa_logs_editor_admin_insert" on public.qa_logs;
drop policy if exists "qa_logs_editor_admin_update" on public.qa_logs;
drop policy if exists "qa_logs_editor_admin_delete" on public.qa_logs;

drop policy if exists "ingest_logs_write_insert" on public.ingest_logs;
drop policy if exists "ingest_logs_write_update" on public.ingest_logs;
drop policy if exists "ingest_logs_write_delete" on public.ingest_logs;
drop policy if exists "ingest_logs_admin_insert" on public.ingest_logs;
drop policy if exists "ingest_logs_admin_update" on public.ingest_logs;
drop policy if exists "ingest_logs_admin_delete" on public.ingest_logs;
drop policy if exists "ingest_logs_editor_admin_insert" on public.ingest_logs;
drop policy if exists "ingest_logs_editor_admin_update" on public.ingest_logs;
drop policy if exists "ingest_logs_editor_admin_delete" on public.ingest_logs;

drop policy if exists "qa_logs_editor_admin_select" on public.qa_logs;
create policy "qa_logs_editor_admin_select"
on public.qa_logs
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "ingest_logs_editor_admin_select" on public.ingest_logs;
create policy "ingest_logs_editor_admin_select"
on public.ingest_logs
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "qa_logs_service_insert" on public.qa_logs;
create policy "qa_logs_service_insert"
on public.qa_logs
for insert
to service_role
with check (true);

drop policy if exists "ingest_logs_service_insert" on public.ingest_logs;
create policy "ingest_logs_service_insert"
on public.ingest_logs
for insert
to service_role
with check (true);
