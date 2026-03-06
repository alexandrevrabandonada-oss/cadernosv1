create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  duration_sec int null,
  focus_minutes int null,
  items jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_universe_user_started_idx
  on public.study_sessions (universe_id, user_id, started_at desc);

alter table public.study_sessions enable row level security;

drop policy if exists "study_sessions_select_own" on public.study_sessions;
create policy "study_sessions_select_own"
  on public.study_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own"
  on public.study_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "study_sessions_update_own" on public.study_sessions;
create policy "study_sessions_update_own"
  on public.study_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.study_daily (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  focus_minutes int not null default 0,
  actions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (universe_id, user_id, day)
);

create index if not exists study_daily_universe_user_day_idx
  on public.study_daily (universe_id, user_id, day desc);

alter table public.study_daily enable row level security;

drop policy if exists "study_daily_select_own" on public.study_daily;
create policy "study_daily_select_own"
  on public.study_daily
  for select
  using (auth.uid() = user_id);

drop policy if exists "study_daily_insert_own" on public.study_daily;
create policy "study_daily_insert_own"
  on public.study_daily
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "study_daily_update_own" on public.study_daily;
create policy "study_daily_update_own"
  on public.study_daily
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
