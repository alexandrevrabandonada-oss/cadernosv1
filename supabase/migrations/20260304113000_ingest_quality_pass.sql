alter table public.documents
  add column if not exists text_quality_score int null;

alter table public.documents
  add column if not exists text_quality_flags text[] null;

alter table public.documents
  add column if not exists empty_pages_count int null;

alter table public.documents
  add column if not exists pages_count int null;

alter table public.documents
  add column if not exists repeated_lines_top text[] null;

alter table public.documents
  add column if not exists ingest_preset text not null default 'default';

alter table public.documents
  add column if not exists last_processed_at timestamptz null;

alter table public.documents
  drop constraint if exists documents_ingest_preset_check;

alter table public.documents
  add constraint documents_ingest_preset_check
  check (ingest_preset in ('default','aggressive_dedupe','no_dedupe','short_chunks','long_chunks'));

alter table public.documents
  drop constraint if exists documents_text_quality_score_check;

alter table public.documents
  add constraint documents_text_quality_score_check
  check (text_quality_score is null or (text_quality_score >= 0 and text_quality_score <= 100));

alter table public.chunks
  add column if not exists archived boolean not null default false;

create index if not exists idx_chunks_universe_archived_created
  on public.chunks(universe_id, archived, created_at desc);

alter table public.ingest_jobs
  add column if not exists job_kind text not null default 'process';

alter table public.ingest_jobs
  add column if not exists preset text null;

alter table public.ingest_jobs
  drop constraint if exists ingest_jobs_job_kind_check;

alter table public.ingest_jobs
  add constraint ingest_jobs_job_kind_check
  check (job_kind in ('process', 'reprocess'));

alter table public.ingest_jobs
  drop constraint if exists ingest_jobs_preset_check;

alter table public.ingest_jobs
  add constraint ingest_jobs_preset_check
  check (
    preset is null
    or preset in ('default','aggressive_dedupe','no_dedupe','short_chunks','long_chunks')
  );

create table if not exists public.document_pages_quality (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number int not null,
  char_count int not null default 0,
  word_count int not null default 0,
  is_empty boolean not null default false,
  repeat_signature text null,
  created_at timestamptz not null default now(),
  unique (document_id, page_number)
);

create index if not exists idx_document_pages_quality_doc_page
  on public.document_pages_quality(document_id, page_number);

alter table public.document_pages_quality enable row level security;

drop policy if exists "document_pages_quality_editor_admin_select" on public.document_pages_quality;
create policy "document_pages_quality_editor_admin_select"
on public.document_pages_quality
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "document_pages_quality_editor_admin_insert" on public.document_pages_quality;
create policy "document_pages_quality_editor_admin_insert"
on public.document_pages_quality
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "document_pages_quality_editor_admin_update" on public.document_pages_quality;
create policy "document_pages_quality_editor_admin_update"
on public.document_pages_quality
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "document_pages_quality_editor_admin_delete" on public.document_pages_quality;
create policy "document_pages_quality_editor_admin_delete"
on public.document_pages_quality
for delete
to authenticated
using (public.is_editor_or_admin());

create or replace function public.match_chunks(
  p_universe_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 5
)
returns table (
  chunk_id uuid,
  document_id uuid,
  page_start int,
  page_end int,
  text text,
  similarity float8
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    c.document_id,
    c.page_start,
    c.page_end,
    c.text,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where c.universe_id = p_universe_id
    and c.embedding is not null
    and c.archived = false
    and d.is_deleted = false
  order by c.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;
