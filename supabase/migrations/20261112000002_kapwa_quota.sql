-- Hourly message quota for Kapwa's AI replies (supabase/functions/kapwa-chat).
--
-- Only the edge function, using the service role, touches this: RLS is on
-- with no policies, and the function is not executable by anon or
-- authenticated. `subject` is "user:<id>" or "ip:<sha256>", never raw text.

create table if not exists public.kapwa_usage (
  subject text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (subject, window_start)
);

alter table public.kapwa_usage enable row level security;

create or replace function public.kapwa_take_quota(p_subject text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := date_trunc('hour', now());
  used integer;
begin
  insert into public.kapwa_usage (subject, window_start, count)
  values (p_subject, current_window, 1)
  on conflict (subject, window_start)
    do update set count = public.kapwa_usage.count + 1
  returning count into used;

  -- Old windows are of no further use.
  delete from public.kapwa_usage where window_start < now() - interval '1 day';

  return used <= p_limit;
end;
$$;

revoke all on function public.kapwa_take_quota(text, integer) from public, anon, authenticated;
grant execute on function public.kapwa_take_quota(text, integer) to service_role;
