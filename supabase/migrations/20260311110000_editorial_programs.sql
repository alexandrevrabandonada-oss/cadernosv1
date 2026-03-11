create table if not exists public.editorial_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.editorial_program_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.editorial_programs(id) on delete cascade,
  universe_id uuid not null references public.universes(id) on delete cascade,
  lane text not null default 'bootstrap' check (lane in ('bootstrap', 'ingest', 'quality', 'sprint', 'review', 'highlights', 'publish', 'done')),
  priority int not null default 0,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, universe_id)
);

create index if not exists editorial_program_items_program_lane_priority_idx
  on public.editorial_program_items (program_id, lane, priority desc, updated_at desc);

drop trigger if exists trg_editorial_program_items_set_updated_at on public.editorial_program_items;
create trigger trg_editorial_program_items_set_updated_at
before update on public.editorial_program_items
for each row execute function public.set_updated_at();

alter table public.editorial_programs enable row level security;
alter table public.editorial_program_items enable row level security;

drop policy if exists "editorial_programs_editor_admin_select" on public.editorial_programs;
create policy "editorial_programs_editor_admin_select"
on public.editorial_programs
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "editorial_programs_editor_admin_insert" on public.editorial_programs;
create policy "editorial_programs_editor_admin_insert"
on public.editorial_programs
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "editorial_programs_editor_admin_update" on public.editorial_programs;
create policy "editorial_programs_editor_admin_update"
on public.editorial_programs
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "editorial_programs_editor_admin_delete" on public.editorial_programs;
create policy "editorial_programs_editor_admin_delete"
on public.editorial_programs
for delete
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "editorial_program_items_editor_admin_select" on public.editorial_program_items;
create policy "editorial_program_items_editor_admin_select"
on public.editorial_program_items
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "editorial_program_items_editor_admin_insert" on public.editorial_program_items;
create policy "editorial_program_items_editor_admin_insert"
on public.editorial_program_items
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "editorial_program_items_editor_admin_update" on public.editorial_program_items;
create policy "editorial_program_items_editor_admin_update"
on public.editorial_program_items
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "editorial_program_items_editor_admin_delete" on public.editorial_program_items;
create policy "editorial_program_items_editor_admin_delete"
on public.editorial_program_items
for delete
to authenticated
using (public.is_editor_or_admin());
