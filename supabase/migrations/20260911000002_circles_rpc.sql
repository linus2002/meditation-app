-- Circles: the server functions every write goes through.
--
-- Clients never insert into the circle tables directly (row level security has
-- no insert policies for them). These functions are the only way in, which is
-- what lets the member cap, the circle-local date and the one-answer-a-day
-- rule be enforced here rather than trusted to the app.
--
-- All run as `security definer` with an empty search_path and check auth.uid()
-- themselves.

create function public.is_circle_member(c uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.circle_members where circle_id = c and user_id = auth.uid()
  );
$$;

-- Presence topics look like `circle:<uuid>:live`. Parsed here, where a malformed
-- topic can be refused cleanly instead of failing a cast inside a policy.
create function public.can_use_live_topic(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if topic !~ '^circle:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:live$' then
    return false;
  end if;
  return public.is_circle_member(split_part(topic, ':', 2)::uuid);
end;
$$;

create function public.join_circle(c uuid)
returns public.circles
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  result public.circles;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (select 1 from public.circles where id = c and status = 'open') then
    raise exception 'circle_not_open';
  end if;
  if exists (select 1 from public.circle_members where circle_id = c and user_id = me) then
    raise exception 'already_member';
  end if;
  if (select count(*) from public.circle_members where user_id = me) >= 2 then
    raise exception 'too_many_circles';
  end if;

  -- The guard trigger raises circle_full if the last seat has gone.
  insert into public.circle_members (circle_id, user_id) values (c, me);

  select * into result from public.circles where id = c;
  return result;
end;
$$;

-- "I sat." The date is worked out here, in the circle's zone, so every member's
-- sit lands on the same day regardless of where their phone thinks it is.
create function public.record_checkin(c uuid, sat_at timestamptz, live boolean default false)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  circle_tz text;
  joined timestamptz;
  day date;
begin
  select m.joined_at, ci.tz into joined, circle_tz
  from public.circle_members m
  join public.circles ci on ci.id = m.circle_id
  where m.circle_id = c and m.user_id = me;

  if not found then
    raise exception 'not_a_member';
  end if;
  if sat_at > now() + interval '5 minutes' or sat_at < now() - interval '36 hours' then
    raise exception 'checkin_out_of_range';
  end if;

  day := (sat_at at time zone circle_tz)::date;
  if day < (joined at time zone circle_tz)::date then
    raise exception 'checkin_before_joining';
  end if;

  insert into public.circle_checkins (circle_id, user_id, local_date, live)
  values (c, me, day, live)
  on conflict (circle_id, local_date, user_id)
  do update set live = public.circle_checkins.live or excluded.live;

  return day;
end;
$$;

-- Today's date in the circle's zone, and today's prompt. The prompt rotates by
-- date rather than at random, so it cannot change under someone mid-sentence,
-- and every member of the circle sees the same one.
create function public.circle_today(c uuid)
returns table (today date, prompt_id text, question text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  circle_tz text;
  day date;
  total int;
begin
  if not public.is_circle_member(c) then
    raise exception 'not_a_member';
  end if;

  select tz into circle_tz from public.circles where id = c;
  day := (now() at time zone circle_tz)::date;

  select count(*) into total from public.circle_prompts;
  if total = 0 then
    return;
  end if;

  return query
    select day, p.id, p.question
    from public.circle_prompts p
    order by p.position
    offset (((day - date '2026-01-01') % total) + total) % total
    limit 1;
end;
$$;

-- One answer a day. Answering again edits it; a hidden answer stays hidden.
create function public.answer_prompt(c uuid, answer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  day date;
  prompt text;
begin
  if not public.is_circle_member(c) then
    raise exception 'not_a_member';
  end if;

  select t.today, t.prompt_id into day, prompt from public.circle_today(c) t;
  if prompt is null then
    raise exception 'no_prompt_today';
  end if;

  insert into public.prompt_responses (circle_id, user_id, local_date, prompt_id, body)
  values (c, me, day, prompt, btrim(regexp_replace(answer, '\s+', ' ', 'g')))
  on conflict (circle_id, local_date, user_id)
  do update set body = excluded.body, updated_at = now();
end;
$$;

-- The only way to read another member's name, and only from inside the circle.
create function public.circle_roster(c uuid)
returns table (user_id uuid, display_name text, role text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, p.display_name, m.role, m.joined_at
  from public.circle_members m
  left join public.profiles p on p.id = m.user_id
  where m.circle_id = c and public.is_circle_member(c)
  order by m.joined_at;
$$;

-- The server's clock, so the live session can correct for a phone that is off.
create function public.server_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

-- Required by the app stores wherever an account can be created.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- Signed-in callers only. Anonymous Supabase accounts have the authenticated
-- role too; the anon role is someone who has not signed in at all.
revoke execute on function public.is_circle_member(uuid) from public, anon;
revoke execute on function public.can_use_live_topic(text) from public, anon;
revoke execute on function public.join_circle(uuid) from public, anon;
revoke execute on function public.record_checkin(uuid, timestamptz, boolean) from public, anon;
revoke execute on function public.circle_today(uuid) from public, anon;
revoke execute on function public.answer_prompt(uuid, text) from public, anon;
revoke execute on function public.circle_roster(uuid) from public, anon;
revoke execute on function public.server_now() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;

grant execute on function public.is_circle_member(uuid) to authenticated;
grant execute on function public.can_use_live_topic(text) to authenticated;
grant execute on function public.join_circle(uuid) to authenticated;
grant execute on function public.record_checkin(uuid, timestamptz, boolean) to authenticated;
grant execute on function public.circle_today(uuid) to authenticated;
grant execute on function public.answer_prompt(uuid, text) to authenticated;
grant execute on function public.circle_roster(uuid) to authenticated;
grant execute on function public.server_now() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
