alter table public.shared_notebooks
  add column if not exists meta jsonb not null default '{}'::jsonb;
