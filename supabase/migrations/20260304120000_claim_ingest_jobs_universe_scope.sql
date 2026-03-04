create or replace function public.claim_ingest_jobs(
  p_limit int,
  p_worker_id text,
  p_universe_id uuid default null
)
returns setof public.ingest_jobs
language sql
security definer
set search_path = public
as $$
  with picked as (
    select id
    from public.ingest_jobs
    where status = 'pending'
      and (p_universe_id is null or universe_id = p_universe_id)
    order by created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 5), 20))
  )
  update public.ingest_jobs j
  set
    status = 'running',
    attempts = j.attempts + 1,
    locked_at = now(),
    locked_by = coalesce(p_worker_id, 'worker'),
    updated_at = now()
  from picked
  where j.id = picked.id
  returning j.*;
$$;

