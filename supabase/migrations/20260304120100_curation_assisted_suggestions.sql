create table if not exists public.node_document_suggestions (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  node_id uuid not null references public.nodes(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  score int not null default 0,
  reasons text[] null,
  created_at timestamptz not null default now(),
  constraint node_document_suggestions_unique unique (node_id, document_id),
  constraint node_document_suggestions_score_check check (score >= 0 and score <= 1000)
);

create index if not exists idx_node_document_suggestions_universe_node_score
  on public.node_document_suggestions(universe_id, node_id, score desc);

create table if not exists public.node_evidence_suggestions (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  node_id uuid not null references public.nodes(id) on delete cascade,
  chunk_id uuid not null references public.chunks(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_start int null,
  page_end int null,
  score int not null default 0,
  snippet text not null,
  created_at timestamptz not null default now(),
  constraint node_evidence_suggestions_unique unique (node_id, chunk_id),
  constraint node_evidence_suggestions_score_check check (score >= 0 and score <= 1000)
);

create index if not exists idx_node_evidence_suggestions_universe_node_score
  on public.node_evidence_suggestions(universe_id, node_id, score desc);

create index if not exists idx_node_evidence_suggestions_document
  on public.node_evidence_suggestions(document_id);

create table if not exists public.node_question_suggestions (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  node_id uuid not null references public.nodes(id) on delete cascade,
  question text not null,
  score int not null default 100,
  created_at timestamptz not null default now(),
  constraint node_question_suggestions_unique unique (node_id, question),
  constraint node_question_suggestions_score_check check (score >= 0 and score <= 1000)
);

create index if not exists idx_node_question_suggestions_universe_node_score
  on public.node_question_suggestions(universe_id, node_id, score desc);

alter table public.node_document_suggestions enable row level security;
alter table public.node_evidence_suggestions enable row level security;
alter table public.node_question_suggestions enable row level security;

drop policy if exists "node_document_suggestions_editor_admin_select" on public.node_document_suggestions;
create policy "node_document_suggestions_editor_admin_select"
on public.node_document_suggestions
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "node_document_suggestions_editor_admin_insert" on public.node_document_suggestions;
create policy "node_document_suggestions_editor_admin_insert"
on public.node_document_suggestions
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "node_document_suggestions_editor_admin_update" on public.node_document_suggestions;
create policy "node_document_suggestions_editor_admin_update"
on public.node_document_suggestions
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "node_document_suggestions_editor_admin_delete" on public.node_document_suggestions;
create policy "node_document_suggestions_editor_admin_delete"
on public.node_document_suggestions
for delete
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "node_evidence_suggestions_editor_admin_select" on public.node_evidence_suggestions;
create policy "node_evidence_suggestions_editor_admin_select"
on public.node_evidence_suggestions
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "node_evidence_suggestions_editor_admin_insert" on public.node_evidence_suggestions;
create policy "node_evidence_suggestions_editor_admin_insert"
on public.node_evidence_suggestions
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "node_evidence_suggestions_editor_admin_update" on public.node_evidence_suggestions;
create policy "node_evidence_suggestions_editor_admin_update"
on public.node_evidence_suggestions
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "node_evidence_suggestions_editor_admin_delete" on public.node_evidence_suggestions;
create policy "node_evidence_suggestions_editor_admin_delete"
on public.node_evidence_suggestions
for delete
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "node_question_suggestions_editor_admin_select" on public.node_question_suggestions;
create policy "node_question_suggestions_editor_admin_select"
on public.node_question_suggestions
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "node_question_suggestions_editor_admin_insert" on public.node_question_suggestions;
create policy "node_question_suggestions_editor_admin_insert"
on public.node_question_suggestions
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "node_question_suggestions_editor_admin_update" on public.node_question_suggestions;
create policy "node_question_suggestions_editor_admin_update"
on public.node_question_suggestions
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "node_question_suggestions_editor_admin_delete" on public.node_question_suggestions;
create policy "node_question_suggestions_editor_admin_delete"
on public.node_question_suggestions
for delete
to authenticated
using (public.is_editor_or_admin());
