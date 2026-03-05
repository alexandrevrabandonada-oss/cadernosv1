alter table if exists public.qa_threads
  add column if not exists confidence_score int null;

alter table if exists public.qa_threads
  add column if not exists confidence_label text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'qa_threads_confidence_label_check'
      and conrelid = 'public.qa_threads'::regclass
  ) then
    alter table public.qa_threads
      add constraint qa_threads_confidence_label_check
      check (confidence_label in ('forte', 'media', 'fraca'));
  end if;
end $$;

alter table if exists public.qa_threads
  add column if not exists divergence_flag boolean not null default false;

alter table if exists public.qa_threads
  add column if not exists divergence_summary text null;

alter table if exists public.qa_threads
  add column if not exists limitations jsonb not null default '[]'::jsonb;

alter table if exists public.qa_threads
  add column if not exists docs_distinct int null;

alter table if exists public.qa_threads
  add column if not exists avg_doc_quality int null;

alter table if exists public.citations
  add column if not exists ord int null;

create index if not exists idx_qa_threads_confidence_label on public.qa_threads(confidence_label);
create index if not exists idx_qa_threads_divergence_flag on public.qa_threads(divergence_flag);

alter table if exists public.documents
  add column if not exists method_kind text null;

alter table if exists public.documents
  add column if not exists method_notes text null;

alter table if exists public.documents
  add column if not exists sample_notes text null;
