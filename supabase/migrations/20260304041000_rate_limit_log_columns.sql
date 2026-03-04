alter table if exists public.qa_logs
  add column if not exists user_present boolean not null default false;

alter table if exists public.qa_logs
  add column if not exists scope text not null default 'ask';
