create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  node_id uuid references public.nodes(id) on delete set null,
  evidence_id uuid references public.evidences(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  title text not null,
  summary text not null,
  event_date date,
  period_label text,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_universe_date on public.events(universe_id, event_date desc);
create index if not exists idx_events_node on public.events(node_id);

alter table public.events enable row level security;

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read"
on public.events
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = events.universe_id and u.published = true
  )
);

drop policy if exists "events_admin_insert" on public.events;
create policy "events_admin_insert"
on public.events
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "events_admin_update" on public.events;
create policy "events_admin_update"
on public.events
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "events_admin_delete" on public.events;
create policy "events_admin_delete"
on public.events
for delete
to authenticated
using (public.is_admin());

insert into public.events (id, universe_id, node_id, title, summary, event_date, period_label)
values
  (
    '9f12ad56-1a3a-4f31-a7a2-1ca4c4d0e101',
    'de3d511f-f4de-4f16-a49a-f08fa0a2f101',
    '5a8fecf0-f092-4424-b84f-314ce2f9f102',
    'Marco inicial do universo',
    'Primeiro evento relevante para abertura da linha temporal do MVP.',
    '2023-02-12',
    'Fase 1'
  ),
  (
    '9f12ad56-1a3a-4f31-a7a2-1ca4c4d0e102',
    'de3d511f-f4de-4f16-a49a-f08fa0a2f101',
    '5a8fecf0-f092-4424-b84f-314ce2f9f107',
    'Evolucao cronologica intermediaria',
    'Evento de transicao com aumento de evidencias na base.',
    '2023-08-30',
    'Fase 2'
  ),
  (
    '9f12ad56-1a3a-4f31-a7a2-1ca4c4d0e103',
    'de3d511f-f4de-4f16-a49a-f08fa0a2f101',
    '5a8fecf0-f092-4424-b84f-314ce2f9f108',
    'Consolidacao da sintese',
    'Fechamento parcial com consolidacao dos principais achados.',
    '2024-04-18',
    'Fase 3'
  )
on conflict do nothing;
