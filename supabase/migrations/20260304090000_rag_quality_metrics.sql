alter table if exists public.qa_threads
  add column if not exists mode text not null default 'strict_ok';

alter table if exists public.qa_threads
  add column if not exists docs_used int;

alter table if exists public.qa_threads
  add column if not exists chunks_used int;

alter table if exists public.qa_threads
  add column if not exists insufficient_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'qa_threads_mode_check'
      and conrelid = 'public.qa_threads'::regclass
  ) then
    alter table public.qa_threads
      add constraint qa_threads_mode_check
      check (mode in ('strict_ok', 'insufficient'));
  end if;
end $$;

alter table if exists public.citations
  add column if not exists ord int;

create index if not exists idx_citations_thread_ord
  on public.citations(qa_thread_id, ord);

alter table if exists public.qa_logs
  add column if not exists docs_distintos int;

alter table if exists public.qa_logs
  add column if not exists chunks_usados int;

alter table if exists public.qa_logs
  add column if not exists insufficient_reason text;
