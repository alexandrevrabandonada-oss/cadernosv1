create table if not exists public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  term text not null,
  slug text not null,
  short_def text null,
  body text null,
  tags text[] null,
  node_id uuid null references public.nodes(id) on delete set null,
  evidence_ids uuid[] null,
  question_prompts text[] null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint glossary_terms_universe_slug_unique unique (universe_id, slug)
);

create index if not exists idx_glossary_terms_universe_term
  on public.glossary_terms(universe_id, term);

create index if not exists idx_glossary_terms_tags_gin
  on public.glossary_terms using gin(tags);

drop trigger if exists trg_glossary_terms_set_updated_at on public.glossary_terms;
create trigger trg_glossary_terms_set_updated_at
before update on public.glossary_terms
for each row execute function public.set_updated_at();

alter table public.glossary_terms enable row level security;

drop policy if exists "glossary_terms_public_read" on public.glossary_terms;
create policy "glossary_terms_public_read"
on public.glossary_terms
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.universes u
    where u.id = glossary_terms.universe_id
      and u.published_at is not null
  )
);

drop policy if exists "glossary_terms_editor_admin_insert" on public.glossary_terms;
create policy "glossary_terms_editor_admin_insert"
on public.glossary_terms
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "glossary_terms_editor_admin_update" on public.glossary_terms;
create policy "glossary_terms_editor_admin_update"
on public.glossary_terms
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "glossary_terms_editor_admin_delete" on public.glossary_terms;
create policy "glossary_terms_editor_admin_delete"
on public.glossary_terms
for delete
to authenticated
using (public.is_editor_or_admin());
