-- Meditation ratings: one row per authenticated user per session, score 1-5.
--
-- Design follows the video_likes pattern: clients never write the table
-- directly; set_meditation_rating() is the only write path, so the score
-- constraint and the "clear by re-tapping" logic live in one place.
-- A signed-in user can read back their own rows, which lets a fresh install
-- restore the ratings the reader gave on another device.
--
-- Meditation ids are the slugs from Sanity. The table validates their shape
-- rather than a foreign-key to Sanity.

create table public.meditation_ratings (
  meditation_id text not null
    check (meditation_id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  rated_at timestamptz not null default now(),
  primary key (meditation_id, user_id)
);

create index meditation_ratings_user_idx on public.meditation_ratings (user_id);

alter table public.meditation_ratings enable row level security;

-- A person may read their own ratings (used to restore them on a new device).
create policy "meditation ratings: read own" on public.meditation_ratings
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Sets or clears a rating.
-- Passing the score already stored deletes it (toggle-to-clear UX).
-- Passing null always deletes it.
-- Returns the new score, or null when the row was cleared.
create function public.set_meditation_rating(mid text, score smallint)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing smallint;
  result smallint;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;

  select mr.score into existing
  from public.meditation_ratings mr
  where mr.meditation_id = mid and mr.user_id = me;

  if score is null or existing = score then
    -- Clear: tap the same star to undo, or explicit null.
    delete from public.meditation_ratings
    where meditation_id = mid and user_id = me;
    result := null;
  else
    insert into public.meditation_ratings (meditation_id, user_id, score)
    values (mid, me, score)
    on conflict (meditation_id, user_id)
    do update set score = excluded.score, rated_at = now();
    result := score;
  end if;

  return result;
end;
$$;

-- Returns all ratings for the signed-in user.
-- Called once on app load to restore ratings from another device.
create function public.my_meditation_ratings()
returns table (meditation_id text, score smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.meditation_id, r.score
  from public.meditation_ratings r
  where r.user_id = (select auth.uid());
$$;

revoke all on function public.set_meditation_rating(text, smallint) from public;
revoke all on function public.my_meditation_ratings() from public;
grant execute on function public.set_meditation_rating(text, smallint) to authenticated;
grant execute on function public.my_meditation_ratings() to authenticated;

