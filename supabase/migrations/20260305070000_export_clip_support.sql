alter table public.exports
  add column if not exists source_type text null,
  add column if not exists source_id uuid null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'exports_kind_check'
      and conrelid = 'public.exports'::regclass
  ) then
    alter table public.exports drop constraint exports_kind_check;
  end if;

  alter table public.exports
    add constraint exports_kind_check
    check (kind in ('thread', 'trail', 'tutor_session', 'clip'));
end $$;

create index if not exists idx_exports_source_type_source_id on public.exports(source_type, source_id);
