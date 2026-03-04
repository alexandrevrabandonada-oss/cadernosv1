alter table if exists public.citations
  add column if not exists quote_start int;

alter table if exists public.citations
  add column if not exists quote_end int;

alter table if exists public.citations
  add column if not exists highlight_token text;

create index if not exists idx_citations_thread_id
  on public.citations(qa_thread_id);
