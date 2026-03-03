create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.universes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  cover_url text,
  ui_theme text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  slug text not null,
  title text not null,
  kind text not null,
  summary text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (universe_id, slug),
  constraint nodes_kind_check check (kind in ('concept', 'event', 'person', 'evidence', 'question'))
);

create table if not exists public.edges (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  from_node_id uuid not null references public.nodes(id) on delete cascade,
  to_node_id uuid not null references public.nodes(id) on delete cascade,
  label text not null,
  weight numeric(5, 2),
  constraint edges_distinct_nodes check (from_node_id <> to_node_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  title text not null,
  authors text,
  year int,
  source_url text,
  storage_path text,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  constraint documents_status_check check (status in ('uploaded', 'processed'))
);

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  universe_id uuid not null references public.universes(id) on delete cascade,
  page_start int,
  page_end int,
  text text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create table if not exists public.qa_threads (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  qa_thread_id uuid not null references public.qa_threads(id) on delete cascade,
  chunk_id uuid not null references public.chunks(id) on delete cascade,
  quote text not null,
  page_start int,
  page_end int
);

create table if not exists public.evidences (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  node_id uuid references public.nodes(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  chunk_id uuid references public.chunks(id) on delete set null,
  title text not null,
  summary text not null,
  confidence numeric(4, 3) not null default 0.5,
  source_url text,
  curated boolean not null default true,
  created_at timestamptz not null default now(),
  constraint evidences_confidence_check check (confidence >= 0 and confidence <= 1)
);

create table if not exists public.trails (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text not null,
  created_at timestamptz not null default now(),
  unique (universe_id, slug)
);

create table if not exists public.trail_steps (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails(id) on delete cascade,
  step_order int not null,
  title text not null,
  instruction text,
  node_id uuid references public.nodes(id) on delete set null,
  evidence_id uuid references public.evidences(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (trail_id, step_order)
);

create table if not exists public.tutor_modules (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text not null,
  created_at timestamptz not null default now(),
  unique (universe_id, slug)
);

create table if not exists public.tutor_steps (
  id uuid primary key default gen_random_uuid(),
  tutor_module_id uuid not null references public.tutor_modules(id) on delete cascade,
  step_order int not null,
  title text not null,
  instruction text,
  node_id uuid references public.nodes(id) on delete set null,
  evidence_id uuid references public.evidences(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tutor_module_id, step_order)
);

create index if not exists idx_nodes_universe on public.nodes(universe_id);
create index if not exists idx_edges_universe on public.edges(universe_id);
create index if not exists idx_documents_universe on public.documents(universe_id);
create index if not exists idx_chunks_universe on public.chunks(universe_id);
create index if not exists idx_qa_threads_universe on public.qa_threads(universe_id);
create index if not exists idx_evidences_universe on public.evidences(universe_id);
create index if not exists idx_trails_universe on public.trails(universe_id);
create index if not exists idx_tutor_modules_universe on public.tutor_modules(universe_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'admin';
$$;

alter table public.universes enable row level security;
alter table public.nodes enable row level security;
alter table public.edges enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.qa_threads enable row level security;
alter table public.citations enable row level security;
alter table public.evidences enable row level security;
alter table public.trails enable row level security;
alter table public.trail_steps enable row level security;
alter table public.tutor_modules enable row level security;
alter table public.tutor_steps enable row level security;

create policy "universes_public_read"
on public.universes
for select
to anon, authenticated
using (published = true);

create policy "nodes_public_read"
on public.nodes
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = nodes.universe_id and u.published = true
  )
);

create policy "edges_public_read"
on public.edges
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = edges.universe_id and u.published = true
  )
);

create policy "documents_public_read"
on public.documents
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = documents.universe_id and u.published = true
  )
);

create policy "chunks_public_read"
on public.chunks
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = chunks.universe_id and u.published = true
  )
);

create policy "qa_threads_public_read"
on public.qa_threads
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = qa_threads.universe_id and u.published = true
  )
);

create policy "citations_public_read"
on public.citations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.qa_threads q
    join public.universes u on u.id = q.universe_id
    where q.id = citations.qa_thread_id and u.published = true
  )
);

create policy "evidences_public_read"
on public.evidences
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = evidences.universe_id and u.published = true
  )
);

create policy "trails_public_read"
on public.trails
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = trails.universe_id and u.published = true
  )
);

create policy "trail_steps_public_read"
on public.trail_steps
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.trails t
    join public.universes u on u.id = t.universe_id
    where t.id = trail_steps.trail_id and u.published = true
  )
);

create policy "tutor_modules_public_read"
on public.tutor_modules
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = tutor_modules.universe_id and u.published = true
  )
);

create policy "tutor_steps_public_read"
on public.tutor_steps
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tutor_modules tm
    join public.universes u on u.id = tm.universe_id
    where tm.id = tutor_steps.tutor_module_id and u.published = true
  )
);

do $$
declare
  t text;
  tbl text[] := array[
    'universes',
    'nodes',
    'edges',
    'documents',
    'chunks',
    'qa_threads',
    'citations',
    'evidences',
    'trails',
    'trail_steps',
    'tutor_modules',
    'tutor_steps'
  ];
begin
  foreach t in array tbl loop
    execute format('create policy "%s_admin_insert" on public.%I for insert to authenticated with check (public.is_admin())', t, t);
    execute format('create policy "%s_admin_update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
    execute format('create policy "%s_admin_delete" on public.%I for delete to authenticated using (public.is_admin())', t, t);
  end loop;
end $$;

insert into public.universes (
  id, slug, title, summary, ui_theme, published
)
values (
  'de3d511f-f4de-4f16-a49a-f08fa0a2f101',
  'universo-mvp',
  'Universo MVP Cadernos Vivos',
  'Universo inicial para validacao de grafo, provas, trilhas e tutoria.',
  'concreto-zen',
  true
)
on conflict (slug) do nothing;

insert into public.nodes (id, universe_id, slug, title, kind, summary, tags)
values
  ('5a8fecf0-f092-4424-b84f-314ce2f9f101', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'contexto-historico', 'Contexto Historico', 'concept', 'Panorama historico para situar os demais nos.', array['base', 'historia']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f102', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'evento-gatilho', 'Evento Gatilho', 'event', 'Marco que inicia os desdobramentos do universo.', array['evento']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f103', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'ator-principal', 'Ator Principal', 'person', 'Pessoa ou grupo com papel central.', array['ator']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f104', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'evidencia-chave-1', 'Evidencia Chave 1', 'evidence', 'Documento inicial que sustenta a tese principal.', array['fonte']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f105', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'evidencia-chave-2', 'Evidencia Chave 2', 'evidence', 'Fonte complementar para cruzamento de dados.', array['fonte']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f106', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'hipotese-central', 'Hipotese Central', 'question', 'Hipotese de trabalho para investigacao.', array['hipotese']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f107', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'linha-temporal-1', 'Linha Temporal 1', 'event', 'Primeiro ponto cronologico relevante.', array['linha']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f108', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'linha-temporal-2', 'Linha Temporal 2', 'event', 'Segundo ponto cronologico relevante.', array['linha']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f109', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'contra-argumento', 'Contra-Argumento', 'concept', 'Interpretacao alternativa para debate.', array['debate']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f110', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'trilha-inicial', 'Trilha Inicial', 'concept', 'Entrada guiada para novos usuarios.', array['trilha']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f111', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'modulo-tutoria', 'Modulo Tutoria', 'concept', 'Modulo base de acompanhamento pedagogico.', array['tutoria']),
  ('5a8fecf0-f092-4424-b84f-314ce2f9f112', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', 'sintese-final', 'Sintese Final', 'concept', 'Conclusao provisoria do universo.', array['sintese'])
on conflict (universe_id, slug) do nothing;

insert into public.edges (id, universe_id, from_node_id, to_node_id, label, weight)
values
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e101', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f101', '5a8fecf0-f092-4424-b84f-314ce2f9f102', 'contextualiza', 0.8),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e102', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f102', '5a8fecf0-f092-4424-b84f-314ce2f9f103', 'impacta', 0.9),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e103', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f103', '5a8fecf0-f092-4424-b84f-314ce2f9f106', 'sustenta', 0.7),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e104', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f104', '5a8fecf0-f092-4424-b84f-314ce2f9f106', 'evidencia', 0.95),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e105', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f105', '5a8fecf0-f092-4424-b84f-314ce2f9f106', 'corrobora', 0.85),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e106', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f106', '5a8fecf0-f092-4424-b84f-314ce2f9f109', 'gera-debate', 0.65),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e107', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f102', '5a8fecf0-f092-4424-b84f-314ce2f9f107', 'inicia', 0.88),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e108', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f107', '5a8fecf0-f092-4424-b84f-314ce2f9f108', 'evolui-para', 0.8),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e109', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f108', '5a8fecf0-f092-4424-b84f-314ce2f9f112', 'conclui-em', 0.75),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e110', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f110', '5a8fecf0-f092-4424-b84f-314ce2f9f111', 'prepara', 0.7),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e111', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f111', '5a8fecf0-f092-4424-b84f-314ce2f9f112', 'apoia', 0.76),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e112', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f109', '5a8fecf0-f092-4424-b84f-314ce2f9f112', 'tensiona', 0.58),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e113', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f104', '5a8fecf0-f092-4424-b84f-314ce2f9f105', 'complementa', 0.82),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e114', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f101', '5a8fecf0-f092-4424-b84f-314ce2f9f110', 'organiza', 0.64),
  ('6b7f9d22-97f7-4d87-9c78-4ef5c8a8e115', 'de3d511f-f4de-4f16-a49a-f08fa0a2f101', '5a8fecf0-f092-4424-b84f-314ce2f9f106', '5a8fecf0-f092-4424-b84f-314ce2f9f112', 'responde', 0.73)
on conflict do nothing;
