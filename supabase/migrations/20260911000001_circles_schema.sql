-- Circles: tables, views and triggers.
--
-- Small, persistent groups (at most 20) that sit together at a set time.
-- Everything a member can see about another member is deliberately thin: that
-- they joined, that they sat on a given day (never for how long, never what),
-- and their one-line answer to the day's prompt. There is nothing here to rank.
--
-- Phase-2 columns (created_by, visibility, merged_into, role = 'anchor') and
-- phase-3 columns (profiles.tz_band, profiles.region) exist but are unused.

create type public.circle_goal as enum ('calm', 'sleep', 'focus', 'habit');
create type public.time_band as enum ('morning', 'midday', 'evening', 'night');
create type public.circle_level as enum ('all', 'new', 'experienced');

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (
    display_name is null
    or (char_length(btrim(display_name)) between 1 and 32 and display_name !~* '(https?://|www\.)')
  ),
  -- Phase 3 (opt-in nearby members). Never GPS.
  tz_band smallint check (tz_band between -12 and 14),
  region text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Circles and membership
-- ---------------------------------------------------------------------------

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null check (char_length(name) between 1 and 48),
  description text not null check (char_length(description) <= 280),
  goal public.circle_goal not null,
  time_band public.time_band not null,
  level public.circle_level not null default 'all',
  -- The session is a wall-clock time in this IANA zone.
  tz text not null,
  tz_band smallint not null default 0,
  session_time time not null,
  -- ISO weekdays, 1 = Monday.
  session_days smallint[] not null default '{1,2,3,4,5,6,7}',
  -- An id from src/data/meditations.ts (later: a Sanity slug).
  meditation_id text not null,
  capacity smallint not null default 20 check (capacity between 2 and 20),
  member_count smallint not null default 0 check (member_count >= 0 and member_count <= capacity),
  status text not null default 'open' check (status in ('open', 'closed', 'merged')),
  -- Phase 2: user-created and invite-only circles, auto-merge.
  created_by uuid references auth.users on delete set null,
  visibility text not null default 'listed' check (visibility in ('listed', 'invite')),
  merged_into uuid references public.circles,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('member', 'anchor')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index circle_members_user_idx on public.circle_members (user_id);

-- ---------------------------------------------------------------------------
-- Sitting together
-- ---------------------------------------------------------------------------

-- "Sat today": one row per member per circle-local day. No duration, no
-- meditation id — the circle learns that you sat, and nothing to compare.
create table public.circle_checkins (
  circle_id uuid not null references public.circles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  local_date date not null,
  live boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (circle_id, local_date, user_id)
);

-- The streak latch. A day is written once enough members have sat, and never
-- removed, so later leaves or deleted accounts cannot rewrite the past.
create table public.circle_days (
  circle_id uuid not null references public.circles on delete cascade,
  local_date date not null,
  met_at timestamptz not null default now(),
  primary key (circle_id, local_date)
);

-- ---------------------------------------------------------------------------
-- The daily prompt
-- ---------------------------------------------------------------------------

create table public.circle_prompts (
  id text primary key,
  question text not null,
  position int unique not null
);

create table public.prompt_responses (
  circle_id uuid not null references public.circles on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  local_date date not null,
  prompt_id text not null references public.circle_prompts,
  body text not null check (
    char_length(btrim(body)) between 1 and 140
    and body !~* '(https?://|www\.)'
    and body !~ '[\r\n]'
  ),
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (circle_id, local_date, user_id)
);

create table public.response_reports (
  circle_id uuid not null,
  local_date date not null,
  author_id uuid not null,
  reporter_id uuid not null default auth.uid() references auth.users on delete cascade,
  reason text not null check (reason in ('unkind', 'spam', 'unsafe', 'other')),
  created_at timestamptz not null default now(),
  primary key (circle_id, local_date, author_id, reporter_id),
  foreign key (circle_id, local_date, author_id)
    references public.prompt_responses (circle_id, local_date, user_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

-- How many sat each day. Runs with the caller's rights, so it shows only
-- circles the caller belongs to.
create view public.circle_day_totals with (security_invoker = true) as
  select circle_id, local_date, count(*)::int as sitters
  from public.circle_checkins
  group by circle_id, local_date;

-- For the team only: the input to phase-2 auto-merge.
create view public.circle_activity as
  select
    c.id,
    c.slug,
    c.member_count,
    count(distinct k.user_id) filter (where k.local_date > current_date - 7) as active_7d
  from public.circles c
  left join public.circle_checkins k on k.circle_id = c.id
  group by c.id;

revoke all on public.circle_activity from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Every new account gets a profile row, with no name until one is chosen.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The cap. Locking the circle row serialises concurrent joins, so two people
-- taking the last seat at once cannot both get it.
create function public.circle_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seats record;
begin
  select capacity, member_count into seats
  from public.circles
  where id = new.circle_id
  for update;

  if not found then
    raise exception 'circle_not_found';
  end if;
  if seats.member_count >= seats.capacity then
    raise exception 'circle_full';
  end if;
  return new;
end;
$$;

create trigger circle_members_guard
  before insert on public.circle_members
  for each row execute function public.circle_members_guard();

create function public.circle_members_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.circles set member_count = member_count + 1 where id = new.circle_id;
  elsif tg_op = 'DELETE' then
    update public.circles set member_count = greatest(member_count - 1, 0) where id = old.circle_id;
  end if;
  return null;
end;
$$;

create trigger circle_members_count
  after insert or delete on public.circle_members
  for each row execute function public.circle_members_count();

-- A day counts once min(3, members) different members have sat.
-- Keep the 3 in step with CIRCLE_DAY_QUORUM in src/lib/circles/streak.ts.
create function public.latch_circle_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  members int;
  sitters int;
begin
  -- Serialise check-ins per circle so two arriving together both get counted.
  select member_count into members from public.circles where id = new.circle_id for update;

  select count(*) into sitters
  from public.circle_checkins
  where circle_id = new.circle_id and local_date = new.local_date;

  if sitters >= least(3, greatest(coalesce(members, 1), 1)) then
    insert into public.circle_days (circle_id, local_date)
    values (new.circle_id, new.local_date)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger latch_circle_day
  after insert on public.circle_checkins
  for each row execute function public.latch_circle_day();

-- Two different reporters hide an answer. Editing it does not bring it back.
create function public.hide_reported_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(distinct reporter_id)
    from public.response_reports
    where circle_id = new.circle_id
      and local_date = new.local_date
      and author_id = new.author_id
  ) >= 2 then
    update public.prompt_responses
    set hidden = true
    where circle_id = new.circle_id
      and local_date = new.local_date
      and user_id = new.author_id;
  end if;
  return null;
end;
$$;

create trigger hide_reported_response
  after insert on public.response_reports
  for each row execute function public.hide_reported_response();

-- Trigger functions are never called directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.circle_members_guard() from public, anon, authenticated;
revoke execute on function public.circle_members_count() from public, anon, authenticated;
revoke execute on function public.latch_circle_day() from public, anon, authenticated;
revoke execute on function public.hide_reported_response() from public, anon, authenticated;
