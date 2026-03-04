create table if not exists public.curadoria_sprint_runs (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  created_by uuid null references auth.users(id) on delete set null,
  mode text not null default 'core' check (mode in ('core', 'all')),
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_curadoria_sprint_runs_universe_created_at
  on public.curadoria_sprint_runs(universe_id, created_at desc);

alter table public.curadoria_sprint_runs enable row level security;

drop policy if exists "curadoria_sprint_runs_editor_admin_select" on public.curadoria_sprint_runs;
create policy "curadoria_sprint_runs_editor_admin_select"
on public.curadoria_sprint_runs
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "curadoria_sprint_runs_editor_admin_insert" on public.curadoria_sprint_runs;
create policy "curadoria_sprint_runs_editor_admin_insert"
on public.curadoria_sprint_runs
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "curadoria_sprint_runs_editor_admin_update" on public.curadoria_sprint_runs;
create policy "curadoria_sprint_runs_editor_admin_update"
on public.curadoria_sprint_runs
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "curadoria_sprint_runs_editor_admin_delete" on public.curadoria_sprint_runs;
create policy "curadoria_sprint_runs_editor_admin_delete"
on public.curadoria_sprint_runs
for delete
to authenticated
using (public.is_editor_or_admin());

