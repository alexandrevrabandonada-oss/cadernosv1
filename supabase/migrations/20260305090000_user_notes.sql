create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('highlight', 'note')),
  title text null,
  text text not null,
  source_type text not null,
  source_id uuid null,
  source_meta jsonb not null default '{}'::jsonb,
  tags text[] null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_notes_universe_user_created_at
  on public.user_notes(universe_id, user_id, created_at desc);

create index if not exists idx_user_notes_user_created_at
  on public.user_notes(user_id, created_at desc);

create index if not exists idx_user_notes_tags_gin
  on public.user_notes using gin(tags);

drop trigger if exists trg_user_notes_set_updated_at on public.user_notes;
create trigger trg_user_notes_set_updated_at
before update on public.user_notes
for each row execute function public.set_updated_at();

alter table public.user_notes enable row level security;

drop policy if exists "user_notes_owner_select" on public.user_notes;
create policy "user_notes_owner_select"
on public.user_notes
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_notes_owner_insert" on public.user_notes;
create policy "user_notes_owner_insert"
on public.user_notes
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_notes_owner_update" on public.user_notes;
create policy "user_notes_owner_update"
on public.user_notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_notes_owner_delete" on public.user_notes;
create policy "user_notes_owner_delete"
on public.user_notes
for delete
to authenticated
using (auth.uid() = user_id);
