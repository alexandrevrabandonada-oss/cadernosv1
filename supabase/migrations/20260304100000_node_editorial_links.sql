create table if not exists public.node_documents (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  node_id uuid not null references public.nodes(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  weight int not null default 100,
  note text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint node_documents_weight_check check (weight >= 0 and weight <= 1000),
  constraint node_documents_unique_node_document unique (node_id, document_id)
);

create index if not exists idx_node_documents_universe_node on public.node_documents(universe_id, node_id);
create index if not exists idx_node_documents_universe_document on public.node_documents(universe_id, document_id);
create index if not exists idx_node_documents_node_weight on public.node_documents(node_id, weight desc);

create table if not exists public.node_evidences (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  node_id uuid not null references public.nodes(id) on delete cascade,
  evidence_id uuid not null references public.evidences(id) on delete cascade,
  pin_rank int not null default 100,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint node_evidences_pin_rank_check check (pin_rank >= 0 and pin_rank <= 1000),
  constraint node_evidences_unique_node_evidence unique (node_id, evidence_id)
);

create index if not exists idx_node_evidences_universe_node on public.node_evidences(universe_id, node_id);
create index if not exists idx_node_evidences_node_rank on public.node_evidences(node_id, pin_rank asc);

create table if not exists public.node_questions (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  node_id uuid not null references public.nodes(id) on delete cascade,
  question text not null,
  pin_rank int not null default 100,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint node_questions_pin_rank_check check (pin_rank >= 0 and pin_rank <= 1000),
  constraint node_questions_unique_node_question unique (node_id, question)
);

create index if not exists idx_node_questions_universe_node on public.node_questions(universe_id, node_id);
create index if not exists idx_node_questions_node_rank on public.node_questions(node_id, pin_rank asc);

alter table public.qa_threads
  add column if not exists node_id uuid null references public.nodes(id) on delete set null;

create index if not exists idx_qa_threads_node on public.qa_threads(node_id);

drop trigger if exists trg_node_documents_set_updated_at on public.node_documents;
create trigger trg_node_documents_set_updated_at
before update on public.node_documents
for each row execute function public.set_updated_at();

alter table public.node_documents enable row level security;
alter table public.node_evidences enable row level security;
alter table public.node_questions enable row level security;

drop policy if exists "node_documents_public_read" on public.node_documents;
create policy "node_documents_public_read"
on public.node_documents
for select
to anon
using (
  exists (
    select 1
    from public.universes u
    where u.id = node_documents.universe_id and u.published_at is not null
  )
);

drop policy if exists "node_documents_authenticated_read_all" on public.node_documents;
create policy "node_documents_authenticated_read_all"
on public.node_documents
for select
to authenticated
using (true);

drop policy if exists "node_documents_editor_admin_insert" on public.node_documents;
create policy "node_documents_editor_admin_insert"
on public.node_documents
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "node_documents_editor_admin_update" on public.node_documents;
create policy "node_documents_editor_admin_update"
on public.node_documents
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "node_documents_editor_admin_delete" on public.node_documents;
create policy "node_documents_editor_admin_delete"
on public.node_documents
for delete
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "node_evidences_public_read" on public.node_evidences;
create policy "node_evidences_public_read"
on public.node_evidences
for select
to anon
using (
  exists (
    select 1
    from public.universes u
    where u.id = node_evidences.universe_id and u.published_at is not null
  )
);

drop policy if exists "node_evidences_authenticated_read_all" on public.node_evidences;
create policy "node_evidences_authenticated_read_all"
on public.node_evidences
for select
to authenticated
using (true);

drop policy if exists "node_evidences_editor_admin_insert" on public.node_evidences;
create policy "node_evidences_editor_admin_insert"
on public.node_evidences
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "node_evidences_editor_admin_update" on public.node_evidences;
create policy "node_evidences_editor_admin_update"
on public.node_evidences
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "node_evidences_editor_admin_delete" on public.node_evidences;
create policy "node_evidences_editor_admin_delete"
on public.node_evidences
for delete
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "node_questions_public_read" on public.node_questions;
create policy "node_questions_public_read"
on public.node_questions
for select
to anon
using (
  exists (
    select 1
    from public.universes u
    where u.id = node_questions.universe_id and u.published_at is not null
  )
);

drop policy if exists "node_questions_authenticated_read_all" on public.node_questions;
create policy "node_questions_authenticated_read_all"
on public.node_questions
for select
to authenticated
using (true);

drop policy if exists "node_questions_editor_admin_insert" on public.node_questions;
create policy "node_questions_editor_admin_insert"
on public.node_questions
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "node_questions_editor_admin_update" on public.node_questions;
create policy "node_questions_editor_admin_update"
on public.node_questions
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "node_questions_editor_admin_delete" on public.node_questions;
create policy "node_questions_editor_admin_delete"
on public.node_questions
for delete
to authenticated
using (public.is_editor_or_admin());
