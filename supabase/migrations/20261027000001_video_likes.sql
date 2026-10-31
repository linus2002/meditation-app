-- Video likes: one row per person per clip, so every viewer sees the same count.
--
-- As with Circles, clients never write the table directly: there is no insert
-- or delete policy, and set_video_like() is the only way in. Counts are read
-- through video_like_counts(), which returns totals only, so nobody can see who
-- liked what. A person can read their own rows, which is how a phone that lost
-- its storage finds out which clips it had liked.
--
-- Video ids are the slugs from Sanity (Studio → Videos). The table cannot check
-- them against Sanity, so it checks their shape instead.

create table public.video_likes (
  video_id text not null check (video_id ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

create index video_likes_user_idx on public.video_likes (user_id);

alter table public.video_likes enable row level security;

create policy "video likes: read own" on public.video_likes
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Likes or unlikes a clip for the signed-in person and returns its new count.
-- Liking twice, or unliking something never liked, is not an error.
create function public.set_video_like(v text, liked boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  total integer;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;

  if liked then
    insert into public.video_likes (video_id, user_id)
    values (v, me)
    on conflict do nothing;
  else
    delete from public.video_likes where video_id = v and user_id = me;
  end if;

  select count(*)::integer into total from public.video_likes where video_id = v;
  return total;
end;
$$;

-- Like totals for the given clips. Open to everyone, signed in or not.
-- Clips nobody has liked are simply absent.
create function public.video_like_counts(ids text[])
returns table (video_id text, likes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select l.video_id, count(*)::integer
  from public.video_likes l
  where l.video_id = any (ids)
  group by l.video_id;
$$;

revoke all on function public.set_video_like(text, boolean) from public;
revoke all on function public.video_like_counts(text[]) from public;
grant execute on function public.set_video_like(text, boolean) to authenticated;
grant execute on function public.video_like_counts(text[]) to anon, authenticated;
