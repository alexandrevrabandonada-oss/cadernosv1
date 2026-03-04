create table if not exists public.user_trail_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  universe_id uuid not null references public.universes(id) on delete cascade,
  trail_id uuid not null references public.trails(id) on delete cascade,
  step_id uuid not null references public.trail_steps(id) on delete cascade,
  status text not null default 'done' check (status in ('done')),
  completed_at timestamptz not null default now(),
  constraint user_trail_progress_unique_user_step unique (user_id, step_id)
);

create index if not exists idx_user_trail_progress_user_trail
  on public.user_trail_progress(user_id, trail_id);

alter table public.user_trail_progress enable row level security;

drop policy if exists "user_trail_progress_owner_select" on public.user_trail_progress;
create policy "user_trail_progress_owner_select"
on public.user_trail_progress
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_trail_progress_owner_insert" on public.user_trail_progress;
create policy "user_trail_progress_owner_insert"
on public.user_trail_progress
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_trail_progress_owner_delete" on public.user_trail_progress;
create policy "user_trail_progress_owner_delete"
on public.user_trail_progress
for delete
to authenticated
using (auth.uid() = user_id);

alter table public.trail_steps
  add column if not exists required_evidence_ids uuid[] null;

alter table public.trail_steps
  add column if not exists guided_question text null;

alter table public.trail_steps
  add column if not exists guided_node_id uuid null references public.nodes(id) on delete set null;

alter table public.trail_steps
  add column if not exists requires_question boolean not null default false;
