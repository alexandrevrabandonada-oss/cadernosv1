alter table public.documents
add column if not exists is_deleted boolean not null default false;

drop policy if exists "documents_public_read" on public.documents;

create policy "documents_public_read"
on public.documents
for select
to anon, authenticated
using (
  is_deleted = false
  and exists (
    select 1 from public.universes u
    where u.id = documents.universe_id and u.published = true
  )
);
