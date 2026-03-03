create table if not exists public.qa_logs (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid references public.universes(id) on delete set null,
  status text not null default 'ok',
  strict_mode boolean not null default true,
  question_length int not null default 0,
  citations_count int not null default 0,
  evidence_sufficient boolean not null default false,
  latency_ms int,
  requester_hash text,
  created_at timestamptz not null default now(),
  constraint qa_logs_status_check check (status in ('ok', 'invalid_payload', 'rate_limited', 'error'))
);

create index if not exists idx_qa_logs_created_at on public.qa_logs(created_at desc);
create index if not exists idx_qa_logs_universe on public.qa_logs(universe_id, created_at desc);

alter table public.qa_logs enable row level security;

drop policy if exists "qa_logs_public_read" on public.qa_logs;
create policy "qa_logs_public_read"
on public.qa_logs
for select
to anon, authenticated
using (false);

drop policy if exists "qa_logs_admin_insert" on public.qa_logs;
create policy "qa_logs_admin_insert"
on public.qa_logs
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "qa_logs_admin_update" on public.qa_logs;
create policy "qa_logs_admin_update"
on public.qa_logs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "qa_logs_admin_delete" on public.qa_logs;
create policy "qa_logs_admin_delete"
on public.qa_logs
for delete
to authenticated
using (public.is_admin());
