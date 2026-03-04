create table if not exists public.tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'done')),
  current_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tutor_sessions_universe_user
  on public.tutor_sessions(universe_id, user_id, created_at desc);

drop trigger if exists trg_tutor_sessions_set_updated_at on public.tutor_sessions;
create trigger trg_tutor_sessions_set_updated_at
before update on public.tutor_sessions
for each row execute function public.set_updated_at();

create table if not exists public.tutor_points (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tutor_sessions(id) on delete cascade,
  universe_id uuid not null references public.universes(id) on delete cascade,
  node_id uuid null references public.nodes(id) on delete set null,
  title text not null,
  goal text not null,
  required_evidence_ids uuid[] null,
  guided_questions text[] null,
  order_index int not null,
  created_at timestamptz not null default now(),
  constraint tutor_points_unique_session_order unique (session_id, order_index)
);

create index if not exists idx_tutor_points_session_order
  on public.tutor_points(session_id, order_index);

alter table public.tutor_sessions enable row level security;
alter table public.tutor_points enable row level security;

drop policy if exists "tutor_sessions_owner_select" on public.tutor_sessions;
create policy "tutor_sessions_owner_select"
on public.tutor_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "tutor_sessions_owner_insert" on public.tutor_sessions;
create policy "tutor_sessions_owner_insert"
on public.tutor_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "tutor_sessions_owner_update" on public.tutor_sessions;
create policy "tutor_sessions_owner_update"
on public.tutor_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tutor_points_owner_select" on public.tutor_points;
create policy "tutor_points_owner_select"
on public.tutor_points
for select
to authenticated
using (
  exists (
    select 1
    from public.tutor_sessions s
    where s.id = tutor_points.session_id and s.user_id = auth.uid()
  )
);

drop policy if exists "tutor_points_owner_insert" on public.tutor_points;
create policy "tutor_points_owner_insert"
on public.tutor_points
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tutor_sessions s
    where s.id = tutor_points.session_id and s.user_id = auth.uid()
  )
);
