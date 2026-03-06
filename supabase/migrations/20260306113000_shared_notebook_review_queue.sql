alter table public.shared_notebook_items
  add column if not exists review_status text not null default 'draft'
    check (review_status in ('draft', 'review', 'approved', 'rejected'));

alter table public.shared_notebook_items
  add column if not exists editorial_note text null;

alter table public.shared_notebook_items
  add column if not exists reviewed_by uuid null references auth.users(id) on delete set null;

alter table public.shared_notebook_items
  add column if not exists reviewed_at timestamptz null;

alter table public.shared_notebook_items
  add column if not exists promoted_type text null;

alter table public.shared_notebook_items
  add column if not exists promoted_id uuid null;

alter table public.shared_notebook_items
  drop constraint if exists shared_notebook_items_promoted_type_check;

alter table public.shared_notebook_items
  add constraint shared_notebook_items_promoted_type_check
  check (promoted_type is null or promoted_type in ('evidence', 'node_question', 'glossary_term', 'event', 'trail_step'));

create table if not exists public.shared_notebook_audit_logs (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.shared_notebooks(id) on delete cascade,
  item_id uuid not null references public.shared_notebook_items(id) on delete cascade,
  action text not null,
  from_status text null,
  to_status text null,
  note text null,
  changed_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists shared_notebook_audit_notebook_created_idx
  on public.shared_notebook_audit_logs (notebook_id, created_at desc);

create index if not exists shared_notebook_audit_item_created_idx
  on public.shared_notebook_audit_logs (item_id, created_at desc);

alter table public.shared_notebook_audit_logs enable row level security;

drop policy if exists "shared_notebook_items_update_editor" on public.shared_notebook_items;
create policy "shared_notebook_items_update_editor"
on public.shared_notebook_items
for update
to authenticated
using (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_items.notebook_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_items.notebook_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
);

drop policy if exists "shared_notebook_audit_logs_select_visible" on public.shared_notebook_audit_logs;
create policy "shared_notebook_audit_logs_select_visible"
on public.shared_notebook_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.shared_notebooks n
    where n.id = shared_notebook_audit_logs.notebook_id
      and (
        (
          n.visibility = 'public'
          and exists (
            select 1
            from public.universes u
            where u.id = n.universe_id
              and u.published_at is not null
          )
        )
        or exists (
          select 1
          from public.shared_notebook_members m
          where m.notebook_id = n.id
            and m.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "shared_notebook_audit_logs_insert_editor" on public.shared_notebook_audit_logs;
create policy "shared_notebook_audit_logs_insert_editor"
on public.shared_notebook_audit_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_audit_logs.notebook_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
);
