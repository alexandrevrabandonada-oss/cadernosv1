create table if not exists public.share_pack_checklists (
  pack_id uuid primary key references public.share_packs(id) on delete cascade,
  universe_id uuid not null references public.universes(id) on delete cascade,
  checks jsonb not null default '{}'::jsonb,
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_share_pack_checklists_universe on public.share_pack_checklists(universe_id);

drop trigger if exists trg_share_pack_checklists_set_updated_at on public.share_pack_checklists;
create trigger trg_share_pack_checklists_set_updated_at
before update on public.share_pack_checklists
for each row execute function public.set_updated_at();

alter table public.share_pack_checklists enable row level security;

drop policy if exists "share_pack_checklists_editor_admin_select" on public.share_pack_checklists;
create policy "share_pack_checklists_editor_admin_select"
on public.share_pack_checklists
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "share_pack_checklists_editor_admin_insert" on public.share_pack_checklists;
create policy "share_pack_checklists_editor_admin_insert"
on public.share_pack_checklists
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "share_pack_checklists_editor_admin_update" on public.share_pack_checklists;
create policy "share_pack_checklists_editor_admin_update"
on public.share_pack_checklists
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

