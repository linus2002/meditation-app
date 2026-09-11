-- Circles: row level security.
--
-- Default deny. Every table has RLS on, and only the policies below open
-- anything up. None of the circle tables has an insert or update policy for
-- clients: writes go through the functions in the previous migration.

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_checkins enable row level security;
alter table public.circle_days enable row level security;
alter table public.circle_prompts enable row level security;
alter table public.prompt_responses enable row level security;
alter table public.response_reports enable row level security;

-- Profiles: your own row only. Other members' names come from circle_roster().
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Circles: open ones can be browsed; closed or merged ones only by members.
create policy "circles: browse open or own" on public.circles
  for select to authenticated
  using (status = 'open' or public.is_circle_member(id));

-- Memberships: your own rows. Leaving is a plain delete of your own row.
create policy "members: read own" on public.circle_members
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "members: leave" on public.circle_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Sits and counted days: members of that circle.
create policy "checkins: members read" on public.circle_checkins
  for select to authenticated
  using (public.is_circle_member(circle_id));

create policy "days: members read" on public.circle_days
  for select to authenticated
  using (public.is_circle_member(circle_id));

-- Prompts are not secret.
create policy "prompts: read" on public.circle_prompts
  for select to authenticated
  using (true);

-- Answers: members read them, except hidden ones (their author still sees
-- their own). Authors can delete their own.
create policy "responses: members read" on public.prompt_responses
  for select to authenticated
  using (
    public.is_circle_member(circle_id)
    and (not hidden or user_id = (select auth.uid()))
  );

create policy "responses: delete own" on public.prompt_responses
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Reports: a member may report someone else's answer in their own circle.
-- Nobody can read reports back; the team reviews them in the dashboard.
create policy "reports: file" on public.response_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and author_id <> (select auth.uid())
    and public.is_circle_member(circle_id)
  );

-- Live presence: private channels named circle:<id>:live, members only.
-- Also switch off "Allow public access" under Realtime settings in the
-- dashboard, or these policies are not consulted.
create policy "live presence: members listen" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'presence'
    and public.can_use_live_topic((select realtime.topic()))
  );

create policy "live presence: members appear" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and public.can_use_live_topic((select realtime.topic()))
  );
