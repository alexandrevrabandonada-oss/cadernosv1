alter table public.tutor_points
  add column if not exists status text not null default 'todo'
  check (status in ('todo', 'done'));

alter table public.tutor_points
  add column if not exists completed_at timestamptz null;

alter table public.tutor_points
  add column if not exists last_thread_id uuid null references public.qa_threads(id) on delete set null;

alter table public.tutor_sessions
  add column if not exists done_at timestamptz null;

drop policy if exists "tutor_points_owner_update" on public.tutor_points;
create policy "tutor_points_owner_update"
on public.tutor_points
for update
to authenticated
using (
  exists (
    select 1
    from public.tutor_sessions s
    where s.id = tutor_points.session_id and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.tutor_sessions s
    where s.id = tutor_points.session_id and s.user_id = auth.uid()
  )
);
