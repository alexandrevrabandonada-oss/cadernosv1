create table if not exists public.tutor_chat_threads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tutor_sessions(id) on delete cascade,
  point_id uuid not null references public.tutor_points(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint tutor_chat_threads_unique_point unique (point_id)
);

create index if not exists idx_tutor_chat_threads_session
  on public.tutor_chat_threads(session_id, created_at desc);

create table if not exists public.tutor_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.tutor_chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'tutor')),
  text text not null,
  qa_thread_id uuid null references public.qa_threads(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tutor_chat_messages_thread_created
  on public.tutor_chat_messages(thread_id, created_at);

alter table public.tutor_chat_threads enable row level security;
alter table public.tutor_chat_messages enable row level security;

drop policy if exists "tutor_chat_threads_owner_select" on public.tutor_chat_threads;
create policy "tutor_chat_threads_owner_select"
on public.tutor_chat_threads
for select
to authenticated
using (
  exists (
    select 1
    from public.tutor_sessions s
    where s.id = tutor_chat_threads.session_id and s.user_id = auth.uid()
  )
);

drop policy if exists "tutor_chat_threads_owner_insert" on public.tutor_chat_threads;
create policy "tutor_chat_threads_owner_insert"
on public.tutor_chat_threads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tutor_sessions s
    where s.id = tutor_chat_threads.session_id and s.user_id = auth.uid()
  )
);

drop policy if exists "tutor_chat_threads_owner_update" on public.tutor_chat_threads;
create policy "tutor_chat_threads_owner_update"
on public.tutor_chat_threads
for update
to authenticated
using (
  exists (
    select 1
    from public.tutor_sessions s
    where s.id = tutor_chat_threads.session_id and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tutor_sessions s
    where s.id = tutor_chat_threads.session_id and s.user_id = auth.uid()
  )
);

drop policy if exists "tutor_chat_threads_owner_delete" on public.tutor_chat_threads;
create policy "tutor_chat_threads_owner_delete"
on public.tutor_chat_threads
for delete
to authenticated
using (
  exists (
    select 1
    from public.tutor_sessions s
    where s.id = tutor_chat_threads.session_id and s.user_id = auth.uid()
  )
);

drop policy if exists "tutor_chat_messages_owner_select" on public.tutor_chat_messages;
create policy "tutor_chat_messages_owner_select"
on public.tutor_chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.tutor_chat_threads t
    join public.tutor_sessions s on s.id = t.session_id
    where t.id = tutor_chat_messages.thread_id and s.user_id = auth.uid()
  )
);

drop policy if exists "tutor_chat_messages_owner_insert" on public.tutor_chat_messages;
create policy "tutor_chat_messages_owner_insert"
on public.tutor_chat_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.tutor_chat_threads t
    join public.tutor_sessions s on s.id = t.session_id
    where t.id = tutor_chat_messages.thread_id and s.user_id = auth.uid()
  )
);

drop policy if exists "tutor_chat_messages_owner_update" on public.tutor_chat_messages;
create policy "tutor_chat_messages_owner_update"
on public.tutor_chat_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.tutor_chat_threads t
    join public.tutor_sessions s on s.id = t.session_id
    where t.id = tutor_chat_messages.thread_id and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tutor_chat_threads t
    join public.tutor_sessions s on s.id = t.session_id
    where t.id = tutor_chat_messages.thread_id and s.user_id = auth.uid()
  )
);

drop policy if exists "tutor_chat_messages_owner_delete" on public.tutor_chat_messages;
create policy "tutor_chat_messages_owner_delete"
on public.tutor_chat_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.tutor_chat_threads t
    join public.tutor_sessions s on s.id = t.session_id
    where t.id = tutor_chat_messages.thread_id and s.user_id = auth.uid()
  )
);

alter table public.qa_logs
  add column if not exists source text not null default 'default';

alter table public.qa_logs
  add column if not exists scoped_docs_count int;

alter table public.qa_logs
  add column if not exists scoped_used boolean not null default false;
