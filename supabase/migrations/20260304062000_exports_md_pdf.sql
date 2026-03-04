create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  kind text not null check (kind in ('thread', 'trail')),
  thread_id uuid null references public.qa_threads(id) on delete set null,
  trail_id uuid null references public.trails(id) on delete set null,
  title text not null,
  format text not null check (format in ('md', 'pdf')),
  storage_path text not null,
  is_public boolean not null default false,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_exports_universe_created_at on public.exports(universe_id, created_at desc);
create index if not exists idx_exports_thread_id on public.exports(thread_id);
create index if not exists idx_exports_trail_id on public.exports(trail_id);

alter table public.exports enable row level security;

drop policy if exists "exports_public_read" on public.exports;
create policy "exports_public_read"
on public.exports
for select
to anon, authenticated
using (
  is_public = true
  and exists (
    select 1 from public.universes u
    where u.id = exports.universe_id and u.published = true
  )
);

drop policy if exists "exports_editor_admin_read_all" on public.exports;
create policy "exports_editor_admin_read_all"
on public.exports
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "exports_editor_admin_insert" on public.exports;
create policy "exports_editor_admin_insert"
on public.exports
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "exports_editor_admin_update" on public.exports;
create policy "exports_editor_admin_update"
on public.exports
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "exports_editor_admin_delete" on public.exports;
create policy "exports_editor_admin_delete"
on public.exports
for delete
to authenticated
using (public.is_editor_or_admin());
