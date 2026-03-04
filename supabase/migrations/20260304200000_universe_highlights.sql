create table if not exists public.universe_highlights (
  universe_id uuid primary key references public.universes(id) on delete cascade,
  evidence_ids uuid[] null,
  question_prompts text[] null,
  event_ids uuid[] null,
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.universe_highlights enable row level security;

drop trigger if exists trg_universe_highlights_set_updated_at on public.universe_highlights;
create trigger trg_universe_highlights_set_updated_at
before update on public.universe_highlights
for each row execute function public.set_updated_at();

drop policy if exists "universe_highlights_public_published_select" on public.universe_highlights;
create policy "universe_highlights_public_published_select"
on public.universe_highlights
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.universes u
    where u.id = universe_highlights.universe_id
      and u.published_at is not null
  )
);

drop policy if exists "universe_highlights_editor_admin_select_all" on public.universe_highlights;
create policy "universe_highlights_editor_admin_select_all"
on public.universe_highlights
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "universe_highlights_editor_admin_insert" on public.universe_highlights;
create policy "universe_highlights_editor_admin_insert"
on public.universe_highlights
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "universe_highlights_editor_admin_update" on public.universe_highlights;
create policy "universe_highlights_editor_admin_update"
on public.universe_highlights
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

