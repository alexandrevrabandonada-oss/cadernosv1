create table if not exists public.share_packs (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  week_key text not null,
  title text not null,
  note text null,
  items jsonb not null default '[]'::jsonb,
  is_pinned boolean not null default false,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (universe_id, week_key)
);

create index if not exists idx_share_packs_universe_week on public.share_packs(universe_id, week_key);

drop trigger if exists trg_share_packs_set_updated_at on public.share_packs;
create trigger trg_share_packs_set_updated_at
before update on public.share_packs
for each row execute function public.set_updated_at();

alter table public.share_packs enable row level security;

drop policy if exists "share_packs_editor_admin_select" on public.share_packs;
create policy "share_packs_editor_admin_select"
on public.share_packs
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "share_packs_editor_admin_insert" on public.share_packs;
create policy "share_packs_editor_admin_insert"
on public.share_packs
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "share_packs_editor_admin_update" on public.share_packs;
create policy "share_packs_editor_admin_update"
on public.share_packs
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "share_packs_editor_admin_delete" on public.share_packs;
create policy "share_packs_editor_admin_delete"
on public.share_packs
for delete
to authenticated
using (public.is_editor_or_admin());
