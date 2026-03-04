create table if not exists public.tutor_session_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tutor_sessions(id) on delete cascade unique,
  universe_id uuid not null references public.universes(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  covered_points jsonb not null default '[]'::jsonb,
  key_findings jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tutor_session_summaries_universe
  on public.tutor_session_summaries(universe_id, created_at desc);

drop trigger if exists trg_tutor_session_summaries_set_updated_at on public.tutor_session_summaries;
create trigger trg_tutor_session_summaries_set_updated_at
before update on public.tutor_session_summaries
for each row execute function public.set_updated_at();

alter table public.tutor_session_summaries enable row level security;

drop policy if exists "tutor_session_summaries_owner_select" on public.tutor_session_summaries;
create policy "tutor_session_summaries_owner_select"
on public.tutor_session_summaries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "tutor_session_summaries_owner_insert" on public.tutor_session_summaries;
create policy "tutor_session_summaries_owner_insert"
on public.tutor_session_summaries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "tutor_session_summaries_owner_update" on public.tutor_session_summaries;
create policy "tutor_session_summaries_owner_update"
on public.tutor_session_summaries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.exports
  add column if not exists session_id uuid null references public.tutor_sessions(id) on delete set null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'exports_kind_check'
      and conrelid = 'public.exports'::regclass
  ) then
    alter table public.exports drop constraint exports_kind_check;
  end if;

  alter table public.exports
    add constraint exports_kind_check
    check (kind in ('thread', 'trail', 'tutor_session'));
end $$;

create index if not exists idx_exports_session_id on public.exports(session_id);
