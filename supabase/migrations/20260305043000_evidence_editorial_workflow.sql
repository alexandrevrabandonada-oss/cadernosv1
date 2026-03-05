-- Evidence editorial workflow: draft -> review -> published -> rejected
alter table public.evidences
  add column if not exists status text not null default 'published'
    check (status in ('draft', 'review', 'published', 'rejected'));

alter table public.evidences
  add column if not exists editorial_note text null;

alter table public.evidences
  add column if not exists published_at timestamptz null;

alter table public.evidences
  add column if not exists reviewed_by uuid null references auth.users(id) on delete set null;

alter table public.evidences
  add column if not exists tags text[] not null default '{}'::text[];

create table if not exists public.evidence_audit_logs (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidences(id) on delete cascade,
  universe_id uuid not null references public.universes(id) on delete cascade,
  action text not null,
  from_status text null,
  to_status text null,
  note text null,
  changed_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_audit_logs_universe_created_at
  on public.evidence_audit_logs(universe_id, created_at desc);

create index if not exists idx_evidence_audit_logs_evidence_created_at
  on public.evidence_audit_logs(evidence_id, created_at desc);

update public.evidences
set status = 'published'
where status is null;

update public.evidences
set published_at = coalesce(published_at, created_at)
where status = 'published'
  and published_at is null;

drop policy if exists "evidences_public_read" on public.evidences;
create policy "evidences_public_read"
on public.evidences
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.universes u
    where u.id = evidences.universe_id and u.published_at is not null
  )
);

drop policy if exists "evidences_authenticated_read_all" on public.evidences;
create policy "evidences_authenticated_read_all"
on public.evidences
for select
to authenticated
using (
  public.is_editor_or_admin()
  or (
    status = 'published'
    and exists (
      select 1
      from public.universes u
      where u.id = evidences.universe_id and u.published_at is not null
    )
  )
);

alter table public.evidence_audit_logs enable row level security;

drop policy if exists "evidence_audit_logs_editor_admin_select" on public.evidence_audit_logs;
create policy "evidence_audit_logs_editor_admin_select"
on public.evidence_audit_logs
for select
to authenticated
using (public.is_editor_or_admin());

drop policy if exists "evidence_audit_logs_editor_admin_insert" on public.evidence_audit_logs;
create policy "evidence_audit_logs_editor_admin_insert"
on public.evidence_audit_logs
for insert
to authenticated
with check (public.is_editor_or_admin());
