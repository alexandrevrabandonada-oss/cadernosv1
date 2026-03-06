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
    check (kind in ('thread', 'trail', 'tutor_session', 'clip', 'notebook', 'shared_notebook'));
end $$;
