create extension if not exists vector;

alter table public.chunks
add column if not exists embedding vector(1536);

create index if not exists idx_chunks_universe_embedding
on public.chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

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
    and d.is_deleted = false
  order by c.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;
