create table if not exists public.ingest_jobs (
  id bigint generated always as identity primary key,
  universe_id uuid not null references public.universes(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error_safe text,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingest_jobs_status_check check (status in ('pending', 'running', 'done', 'error'))
);

create index if not exists idx_ingest_jobs_status_created_at
  on public.ingest_jobs(status, created_at);

create index if not exists idx_ingest_jobs_document_status
  on public.ingest_jobs(document_id, status);

create unique index if not exists idx_ingest_jobs_doc_active_unique
  on public.ingest_jobs(document_id)
  where status in ('pending', 'running');

drop trigger if exists trg_ingest_jobs_set_updated_at on public.ingest_jobs;
create trigger trg_ingest_jobs_set_updated_at
before update on public.ingest_jobs
for each row execute function public.set_updated_at();

create or replace function public.claim_ingest_jobs(p_limit int, p_worker_id text)
returns setof public.ingest_jobs
language sql
security definer
set search_path = public
as $$
  with picked as (
    select id
    from public.ingest_jobs
    where status = 'pending'
    order by created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 5), 20))
  )
  update public.ingest_jobs j
  set
    status = 'running',
    attempts = j.attempts + 1,
    locked_at = now(),
    locked_by = coalesce(p_worker_id, 'worker'),
    updated_at = now()
  from picked
  where j.id = picked.id
  returning j.*;
$$;

alter table public.ingest_jobs enable row level security;

drop policy if exists "ingest_jobs_editor_admin_select" on public.ingest_jobs;
create policy "ingest_jobs_editor_admin_select"
on public.ingest_jobs
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "ingest_jobs_editor_admin_insert" on public.ingest_jobs;
create policy "ingest_jobs_editor_admin_insert"
on public.ingest_jobs
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "ingest_jobs_editor_admin_update" on public.ingest_jobs;
create policy "ingest_jobs_editor_admin_update"
on public.ingest_jobs
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "ingest_jobs_editor_admin_delete" on public.ingest_jobs;
create policy "ingest_jobs_editor_admin_delete"
on public.ingest_jobs
for delete
to authenticated
using (public.is_editor_or_admin());
