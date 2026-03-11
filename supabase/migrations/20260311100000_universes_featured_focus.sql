alter table public.universes add column if not exists is_featured boolean not null default false;
alter table public.universes add column if not exists featured_rank int not null default 0;
alter table public.universes add column if not exists focus_note text null;
alter table public.universes add column if not exists focus_override boolean not null default false;

create index if not exists universes_featured_rank_idx on public.universes (is_featured desc, featured_rank asc, published_at desc);
create index if not exists universes_focus_override_idx on public.universes (focus_override desc, published_at desc);
