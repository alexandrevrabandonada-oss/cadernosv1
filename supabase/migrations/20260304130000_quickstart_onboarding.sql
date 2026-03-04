alter table public.trails
  add column if not exists is_system boolean not null default false;

create index if not exists idx_trails_universe_system
  on public.trails(universe_id, is_system);
