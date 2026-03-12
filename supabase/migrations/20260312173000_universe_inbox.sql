create table if not exists public.universe_inbox_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid null references auth.users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','analyzed','created','archived')),
  title text null,
  slug text null,
  summary text null,
  suggested_template text null check (suggested_template in ('blank_minimal','issue_investigation','territorial_memory','campaign_watch')),
  confidence numeric(5,2) not null default 0,
  warning text null,
  analysis jsonb not null default '{}'::jsonb,
  created_universe_id uuid null references public.universes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.universe_inbox_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.universe_inbox_batches(id) on delete cascade,
  file_name text not null,
  file_size bigint not null default 0,
  mime_type text not null default 'application/pdf',
  storage_path text null,
  extracted_title text null,
  preview_excerpt text null,
  status text not null default 'uploaded' check (status in ('uploaded','analyzed','queued','attached','error')),
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists universe_inbox_batches_created_idx on public.universe_inbox_batches(created_at desc);
create index if not exists universe_inbox_batches_created_by_idx on public.universe_inbox_batches(created_by, created_at desc);
create index if not exists universe_inbox_items_batch_idx on public.universe_inbox_items(batch_id, created_at asc);

alter table public.universe_inbox_batches enable row level security;
alter table public.universe_inbox_items enable row level security;

drop policy if exists universe_inbox_batches_editor_select on public.universe_inbox_batches;
create policy universe_inbox_batches_editor_select on public.universe_inbox_batches
  for select using (public.is_editor_or_admin());

drop policy if exists universe_inbox_batches_editor_insert on public.universe_inbox_batches;
create policy universe_inbox_batches_editor_insert on public.universe_inbox_batches
  for insert with check (public.is_editor_or_admin());

drop policy if exists universe_inbox_batches_editor_update on public.universe_inbox_batches;
create policy universe_inbox_batches_editor_update on public.universe_inbox_batches
  for update using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

drop policy if exists universe_inbox_batches_editor_delete on public.universe_inbox_batches;
create policy universe_inbox_batches_editor_delete on public.universe_inbox_batches
  for delete using (public.is_admin());

drop policy if exists universe_inbox_items_editor_select on public.universe_inbox_items;
create policy universe_inbox_items_editor_select on public.universe_inbox_items
  for select using (public.is_editor_or_admin());

drop policy if exists universe_inbox_items_editor_insert on public.universe_inbox_items;
create policy universe_inbox_items_editor_insert on public.universe_inbox_items
  for insert with check (public.is_editor_or_admin());

drop policy if exists universe_inbox_items_editor_update on public.universe_inbox_items;
create policy universe_inbox_items_editor_update on public.universe_inbox_items
  for update using (public.is_editor_or_admin()) with check (public.is_editor_or_admin());

drop policy if exists universe_inbox_items_editor_delete on public.universe_inbox_items;
create policy universe_inbox_items_editor_delete on public.universe_inbox_items
  for delete using (public.is_admin());
