alter table if exists public.documents
  add column if not exists journal text;

alter table if exists public.documents
  add column if not exists doi text;

alter table if exists public.documents
  add column if not exists abstract text;

alter table if exists public.documents
  add column if not exists pdf_url text;

alter table if exists public.documents
  add column if not exists import_source text;

alter table if exists public.documents
  add column if not exists kind text not null default 'upload';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'documents_status_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents drop constraint documents_status_check;
  end if;
end $$;

alter table public.documents
  add constraint documents_status_check
  check (status in ('uploaded', 'processed', 'link_only', 'error'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_kind_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_kind_check
      check (kind in ('upload', 'doi', 'url'));
  end if;
end $$;

create unique index if not exists idx_documents_universe_doi_unique
  on public.documents(universe_id, doi)
  where doi is not null and doi <> '' and is_deleted = false;

create unique index if not exists idx_documents_universe_source_url_unique
  on public.documents(universe_id, source_url)
  where source_url is not null and source_url <> '' and is_deleted = false;
