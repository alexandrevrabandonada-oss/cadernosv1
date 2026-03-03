create table if not exists public.ingest_logs (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid references public.universes(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  level text not null default 'info',
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ingest_logs_level_check check (level in ('info', 'error'))
);

create index if not exists idx_ingest_logs_universe on public.ingest_logs(universe_id, created_at desc);
create index if not exists idx_ingest_logs_document on public.ingest_logs(document_id, created_at desc);

alter table public.ingest_logs enable row level security;

drop policy if exists "ingest_logs_public_read" on public.ingest_logs;
create policy "ingest_logs_public_read"
on public.ingest_logs
for select
to anon, authenticated
using (false);

drop policy if exists "ingest_logs_admin_insert" on public.ingest_logs;
create policy "ingest_logs_admin_insert"
on public.ingest_logs
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "ingest_logs_admin_update" on public.ingest_logs;
create policy "ingest_logs_admin_update"
on public.ingest_logs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "ingest_logs_admin_delete" on public.ingest_logs;
create policy "ingest_logs_admin_delete"
on public.ingest_logs
for delete
to authenticated
using (public.is_admin());
