-- Circles security checks. Run with `npx supabase test db` against a local
-- Supabase stack (`npx supabase start`). Everything runs in one transaction
-- and is rolled back.

begin;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@circles.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@circles.test'),
  ('00000000-0000-0000-0000-00000000000c', 'c@circles.test');

-- A two-seat circle, so the cap is quick to reach.
insert into public.circles
  (id, slug, name, description, goal, time_band, tz, session_time, meditation_id, capacity)
values
  ('11111111-1111-1111-1111-111111111111', 'rls-test', 'RLS test', 'Test circle.',
   'calm', 'morning', 'Europe/London', '07:00', 'morning-clarity', 2);

-- Visitor, before signing in: "Find your circle" runs here -------------------
set local role anon;

select is(
  (select count(*)::int from public.circles where slug = 'rls-test'),
  1,
  'visitors can browse open circles before signing in');

reset role;
set local role authenticated;

-- Member A --------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$ select public.join_circle('11111111-1111-1111-1111-111111111111') $$,
  'a member can join');

select lives_ok(
  $$ select public.record_checkin('11111111-1111-1111-1111-111111111111', now(), false) $$,
  'a member can check in');

select lives_ok(
  $$ select public.answer_prompt('11111111-1111-1111-1111-111111111111', 'Letting go of the rush') $$,
  'a member can answer the prompt');

select lives_ok(
  $$ select public.answer_prompt('11111111-1111-1111-1111-111111111111', 'Changed my mind') $$,
  'answering again edits the answer');

select is(
  (select count(*)::int from public.prompt_responses),
  1,
  'one answer per member per day');

select throws_ok(
  $$ insert into public.circle_checkins (circle_id, user_id, local_date)
     values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000000a', current_date) $$,
  '42501', null,
  'direct writes are refused');

-- Outsider C --------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

select is(
  (select count(*)::int from public.circle_checkins),
  0,
  'a non-member sees no sits');

select is(
  (select count(*)::int from public.circle_roster('11111111-1111-1111-1111-111111111111')),
  0,
  'a non-member cannot read the roster');

-- Member B takes the last seat ----------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select lives_ok(
  $$ select public.join_circle('11111111-1111-1111-1111-111111111111') $$,
  'a second member can join');

select is(
  (select count(*)::int from public.prompt_responses),
  1,
  'members read each other''s answers');

-- C again: the circle is full -----------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

select throws_ok(
  $$ select public.join_circle('11111111-1111-1111-1111-111111111111') $$,
  'P0001', 'circle_full',
  'a full circle refuses another member');

select * from finish();
rollback;
