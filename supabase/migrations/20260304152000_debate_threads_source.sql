alter table if exists public.qa_threads
  add column if not exists source text not null default 'default';

alter table if exists public.qa_threads
  add column if not exists parent_thread_id uuid null references public.qa_threads(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'qa_threads_source_check'
      and conrelid = 'public.qa_threads'::regclass
  ) then
    alter table public.qa_threads
      add constraint qa_threads_source_check
      check (source in ('default', 'guided', 'tutor_chat'));
  end if;
end $$;

create index if not exists idx_qa_threads_source on public.qa_threads(source);
create index if not exists idx_qa_threads_parent on public.qa_threads(parent_thread_id);
