alter table if exists public.qa_logs
  add column if not exists kind text not null default 'ask';

alter table if exists public.qa_logs
  add column if not exists ok boolean;

alter table if exists public.qa_logs
  add column if not exists status_code int;

alter table if exists public.qa_logs
  add column if not exists chunks_used int;

alter table if exists public.qa_logs
  add column if not exists docs_used int;

alter table if exists public.qa_logs
  add column if not exists rate_limited boolean not null default false;

alter table if exists public.qa_logs
  add column if not exists thread_id uuid references public.qa_threads(id) on delete set null;

alter table if exists public.ingest_logs
  add column if not exists kind text not null default 'ingest_event';

alter table if exists public.ingest_logs
  add column if not exists ok boolean;

alter table if exists public.ingest_logs
  add column if not exists latency_ms int;

alter table if exists public.ingest_logs
  add column if not exists attempts int;

alter table if exists public.ingest_logs
  add column if not exists job_id bigint references public.ingest_jobs(id) on delete set null;

create table if not exists public.export_logs (
  id uuid primary key default gen_random_uuid(),
  export_id uuid references public.exports(id) on delete set null,
  universe_id uuid references public.universes(id) on delete cascade,
  kind text not null default 'export',
  format text check (format in ('md', 'pdf', 'both')),
  ok boolean,
  latency_ms int,
  status_code int,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_qa_logs_created_kind on public.qa_logs(created_at desc, kind);
create index if not exists idx_ingest_logs_created_kind on public.ingest_logs(created_at desc, kind);
create index if not exists idx_export_logs_created_kind on public.export_logs(created_at desc, kind);
create index if not exists idx_export_logs_universe on public.export_logs(universe_id, created_at desc);

alter table public.export_logs enable row level security;

drop policy if exists "export_logs_editor_admin_select" on public.export_logs;
create policy "export_logs_editor_admin_select"
on public.export_logs
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "export_logs_service_insert" on public.export_logs;
create policy "export_logs_service_insert"
on public.export_logs
for insert
to service_role
with check (true);
