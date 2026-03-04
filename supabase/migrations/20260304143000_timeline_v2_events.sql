alter table if exists public.events
  add column if not exists day date null,
  add column if not exists body text null,
  add column if not exists kind text not null default 'event',
  add column if not exists tags text[] null,
  add column if not exists source_url text null;

update public.events
set day = coalesce(day, event_date)
where day is null;

create index if not exists idx_events_universe_day_desc on public.events(universe_id, day desc);
create index if not exists idx_events_universe_kind on public.events(universe_id, kind);
create index if not exists idx_events_tags_gin on public.events using gin(tags);

alter table if exists public.events enable row level security;

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read"
on public.events
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.universes u
    where u.id = events.universe_id and u.published_at is not null
  )
);

drop policy if exists "events_editor_admin_insert" on public.events;
create policy "events_editor_admin_insert"
on public.events
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "events_editor_admin_update" on public.events;
create policy "events_editor_admin_update"
on public.events
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "events_editor_admin_delete" on public.events;
create policy "events_editor_admin_delete"
on public.events
for delete
to authenticated
using (public.is_editor_or_admin());
