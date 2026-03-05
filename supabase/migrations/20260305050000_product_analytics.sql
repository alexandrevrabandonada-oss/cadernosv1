-- Product analytics events for funnel/CTA/share conversion
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid null references public.universes(id) on delete cascade,
  user_id uuid null references auth.users(id) on delete set null,
  session_id text not null,
  event_name text not null,
  route text null,
  referrer_route text null,
  object_type text null,
  object_id uuid null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_universe_created_at
  on public.analytics_events(universe_id, created_at desc);

create index if not exists idx_analytics_events_event_created_at
  on public.analytics_events(event_name, created_at desc);

create index if not exists idx_analytics_events_session_created_at
  on public.analytics_events(session_id, created_at desc);

create index if not exists idx_analytics_events_object
  on public.analytics_events(object_type, object_id);

create index if not exists idx_analytics_events_route
  on public.analytics_events(route);

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events_select_editor_admin" on public.analytics_events;
create policy "analytics_events_select_editor_admin"
on public.analytics_events
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "analytics_events_no_direct_insert" on public.analytics_events;
create policy "analytics_events_no_direct_insert"
on public.analytics_events
for insert
to anon, authenticated
with check (false);

