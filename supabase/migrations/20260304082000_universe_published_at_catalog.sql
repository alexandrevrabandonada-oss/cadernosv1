alter table if exists public.universes
  add column if not exists published_at timestamptz null default null;

create index if not exists idx_universes_published_at on public.universes(published_at);

update public.universes
set published_at = coalesce(published_at, now())
where coalesce(published, false) = true and published_at is null;

update public.universes
set published = (published_at is not null);

create or replace function public.sync_universe_publish_fields()
returns trigger
language plpgsql
as $$
begin
  if new.published_at is null and coalesce(new.published, false) = true then
    new.published_at = now();
  end if;

  new.published = (new.published_at is not null);
  return new;
end;
$$;

drop trigger if exists trg_sync_universe_publish_fields on public.universes;
create trigger trg_sync_universe_publish_fields
before insert or update on public.universes
for each row execute function public.sync_universe_publish_fields();

drop policy if exists "universes_public_read" on public.universes;
create policy "universes_public_read"
on public.universes
for select
to anon, authenticated
using (published_at is not null);

drop policy if exists "nodes_public_read" on public.nodes;
create policy "nodes_public_read"
on public.nodes
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = nodes.universe_id and u.published_at is not null
  )
);

drop policy if exists "edges_public_read" on public.edges;
create policy "edges_public_read"
on public.edges
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = edges.universe_id and u.published_at is not null
  )
);

drop policy if exists "documents_public_read" on public.documents;
create policy "documents_public_read"
on public.documents
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = documents.universe_id and u.published_at is not null
  )
);

drop policy if exists "chunks_public_read" on public.chunks;
create policy "chunks_public_read"
on public.chunks
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = chunks.universe_id and u.published_at is not null
  )
);

drop policy if exists "qa_threads_public_read" on public.qa_threads;
create policy "qa_threads_public_read"
on public.qa_threads
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = qa_threads.universe_id and u.published_at is not null
  )
);

drop policy if exists "citations_public_read" on public.citations;
create policy "citations_public_read"
on public.citations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.qa_threads q
    join public.universes u on u.id = q.universe_id
    where q.id = citations.qa_thread_id and u.published_at is not null
  )
);

drop policy if exists "evidences_public_read" on public.evidences;
create policy "evidences_public_read"
on public.evidences
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = evidences.universe_id and u.published_at is not null
  )
);

drop policy if exists "trails_public_read" on public.trails;
create policy "trails_public_read"
on public.trails
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = trails.universe_id and u.published_at is not null
  )
);

drop policy if exists "trail_steps_public_read" on public.trail_steps;
create policy "trail_steps_public_read"
on public.trail_steps
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.trails t
    join public.universes u on u.id = t.universe_id
    where t.id = trail_steps.trail_id and u.published_at is not null
  )
);

drop policy if exists "tutor_modules_public_read" on public.tutor_modules;
create policy "tutor_modules_public_read"
on public.tutor_modules
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = tutor_modules.universe_id and u.published_at is not null
  )
);

drop policy if exists "tutor_steps_public_read" on public.tutor_steps;
create policy "tutor_steps_public_read"
on public.tutor_steps
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tutor_modules tm
    join public.universes u on u.id = tm.universe_id
    where tm.id = tutor_steps.tutor_module_id and u.published_at is not null
  )
);

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read"
on public.events
for select
to anon, authenticated
using (
  exists (
    select 1 from public.universes u
    where u.id = events.universe_id and u.published_at is not null
  )
);

drop policy if exists "exports_public_read" on public.exports;
create policy "exports_public_read"
on public.exports
for select
to anon, authenticated
using (
  is_public = true
  and exists (
    select 1 from public.universes u
    where u.id = exports.universe_id and u.published_at is not null
  )
);
