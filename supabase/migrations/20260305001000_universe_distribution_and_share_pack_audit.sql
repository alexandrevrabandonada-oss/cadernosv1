create table if not exists public.universe_distribution_settings (
  universe_id uuid primary key references public.universes(id) on delete cascade,
  weekly_pack_enabled boolean not null default false,
  weekly_day int not null default 1 check (weekly_day between 1 and 7),
  weekly_hour int not null default 9 check (weekly_hour between 0 and 23),
  timezone text not null default 'America/Sao_Paulo',
  channels text[] not null default array['instagram','whatsapp','telegram']::text[],
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_universe_distribution_settings_set_updated_at on public.universe_distribution_settings;
create trigger trg_universe_distribution_settings_set_updated_at
before update on public.universe_distribution_settings
for each row execute function public.set_updated_at();

alter table public.universe_distribution_settings enable row level security;

drop policy if exists "universe_distribution_settings_editor_admin_select" on public.universe_distribution_settings;
create policy "universe_distribution_settings_editor_admin_select"
on public.universe_distribution_settings
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "universe_distribution_settings_editor_admin_insert" on public.universe_distribution_settings;
create policy "universe_distribution_settings_editor_admin_insert"
on public.universe_distribution_settings
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "universe_distribution_settings_editor_admin_update" on public.universe_distribution_settings;
create policy "universe_distribution_settings_editor_admin_update"
on public.universe_distribution_settings
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

create table if not exists public.share_pack_posts (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.share_packs(id) on delete cascade,
  universe_id uuid not null references public.universes(id) on delete cascade,
  channel text not null check (channel in ('instagram','whatsapp','telegram','twitter','other')),
  status text not null default 'pending' check (status in ('pending','posted','skipped')),
  posted_at timestamptz null,
  post_url text null,
  note text null,
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (pack_id, channel)
);

create index if not exists idx_share_pack_posts_universe on public.share_pack_posts(universe_id);
create index if not exists idx_share_pack_posts_status on public.share_pack_posts(status, updated_at desc);

drop trigger if exists trg_share_pack_posts_set_updated_at on public.share_pack_posts;
create trigger trg_share_pack_posts_set_updated_at
before update on public.share_pack_posts
for each row execute function public.set_updated_at();

alter table public.share_pack_posts enable row level security;

drop policy if exists "share_pack_posts_editor_admin_select" on public.share_pack_posts;
create policy "share_pack_posts_editor_admin_select"
on public.share_pack_posts
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "share_pack_posts_editor_admin_insert" on public.share_pack_posts;
create policy "share_pack_posts_editor_admin_insert"
on public.share_pack_posts
for insert
to authenticated
with check (public.is_editor_or_admin());

drop policy if exists "share_pack_posts_editor_admin_update" on public.share_pack_posts;
create policy "share_pack_posts_editor_admin_update"
on public.share_pack_posts
for update
to authenticated
using (public.is_editor_or_admin())
with check (public.is_editor_or_admin());

drop policy if exists "share_pack_posts_editor_admin_delete" on public.share_pack_posts;
create policy "share_pack_posts_editor_admin_delete"
on public.share_pack_posts
for delete
to authenticated
using (public.is_editor_or_admin());

create table if not exists public.share_pack_runs (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  week_key text not null,
  run_kind text not null default 'cron' check (run_kind in ('cron','manual')),
  ok boolean not null default true,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_share_pack_runs_universe_created on public.share_pack_runs(universe_id, created_at desc);
create index if not exists idx_share_pack_runs_week on public.share_pack_runs(week_key, created_at desc);

alter table public.share_pack_runs enable row level security;

drop policy if exists "share_pack_runs_editor_admin_select" on public.share_pack_runs;
create policy "share_pack_runs_editor_admin_select"
on public.share_pack_runs
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "share_pack_runs_editor_admin_insert" on public.share_pack_runs;
create policy "share_pack_runs_editor_admin_insert"
on public.share_pack_runs
for insert
to authenticated
with check (public.is_editor_or_admin());

