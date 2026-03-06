create table if not exists public.shared_notebooks (
  id uuid primary key default gen_random_uuid(),
  universe_id uuid not null references public.universes(id) on delete cascade,
  title text not null,
  slug text not null,
  summary text null,
  visibility text not null default 'team' check (visibility in ('private', 'team', 'public')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (universe_id, slug)
);

create table if not exists public.shared_notebook_members (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.shared_notebooks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (notebook_id, user_id)
);

create table if not exists public.shared_notebook_items (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.shared_notebooks(id) on delete cascade,
  universe_id uuid not null references public.universes(id) on delete cascade,
  source_type text not null,
  source_id uuid null,
  source_meta jsonb not null default '{}'::jsonb,
  title text null,
  text text not null,
  tags text[] null,
  note text null,
  added_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists shared_notebooks_universe_updated_idx
  on public.shared_notebooks (universe_id, updated_at desc);

create index if not exists shared_notebook_members_user_idx
  on public.shared_notebook_members (user_id, notebook_id);

create index if not exists shared_notebook_items_notebook_created_idx
  on public.shared_notebook_items (notebook_id, created_at desc);

create index if not exists shared_notebook_items_tags_gin
  on public.shared_notebook_items using gin(tags);

drop trigger if exists trg_shared_notebooks_set_updated_at on public.shared_notebooks;
create trigger trg_shared_notebooks_set_updated_at
before update on public.shared_notebooks
for each row execute function public.set_updated_at();

alter table public.shared_notebooks enable row level security;
alter table public.shared_notebook_members enable row level security;
alter table public.shared_notebook_items enable row level security;

drop policy if exists "shared_notebooks_select_visible" on public.shared_notebooks;
create policy "shared_notebooks_select_visible"
on public.shared_notebooks
for select
to authenticated, anon
using (
  (
    visibility = 'public'
    and exists (
      select 1
      from public.universes u
      where u.id = shared_notebooks.universe_id
        and u.published_at is not null
    )
  )
  or exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebooks.id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "shared_notebooks_insert_owner" on public.shared_notebooks;
create policy "shared_notebooks_insert_owner"
on public.shared_notebooks
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "shared_notebooks_update_editor" on public.shared_notebooks;
create policy "shared_notebooks_update_editor"
on public.shared_notebooks
for update
to authenticated
using (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebooks.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebooks.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
);

drop policy if exists "shared_notebooks_delete_editor" on public.shared_notebooks;
create policy "shared_notebooks_delete_editor"
on public.shared_notebooks
for delete
to authenticated
using (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebooks.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
);

drop policy if exists "shared_notebook_members_select_visible" on public.shared_notebook_members;
create policy "shared_notebook_members_select_visible"
on public.shared_notebook_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_members.notebook_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "shared_notebook_members_insert_manage" on public.shared_notebook_members;
create policy "shared_notebook_members_insert_manage"
on public.shared_notebook_members
for insert
to authenticated
with check (
  (
    auth.uid() = user_id
    and exists (
      select 1
      from public.shared_notebooks n
      where n.id = shared_notebook_members.notebook_id
        and n.created_by = auth.uid()
    )
  )
  or exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_members.notebook_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
);

drop policy if exists "shared_notebook_members_update_manage" on public.shared_notebook_members;
create policy "shared_notebook_members_update_manage"
on public.shared_notebook_members
for update
to authenticated
using (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_members.notebook_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_members.notebook_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
);

drop policy if exists "shared_notebook_members_delete_manage" on public.shared_notebook_members;
create policy "shared_notebook_members_delete_manage"
on public.shared_notebook_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_members.notebook_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
);

drop policy if exists "shared_notebook_items_select_visible" on public.shared_notebook_items;
create policy "shared_notebook_items_select_visible"
on public.shared_notebook_items
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.shared_notebooks n
    where n.id = shared_notebook_items.notebook_id
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

drop policy if exists "shared_notebook_items_insert_editor" on public.shared_notebook_items;
create policy "shared_notebook_items_insert_editor"
on public.shared_notebook_items
for insert
to authenticated
with check (
  auth.uid() = added_by
  and exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_items.notebook_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
);

drop policy if exists "shared_notebook_items_delete_editor" on public.shared_notebook_items;
create policy "shared_notebook_items_delete_editor"
on public.shared_notebook_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.shared_notebook_members m
    where m.notebook_id = shared_notebook_items.notebook_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'editor')
  )
);
