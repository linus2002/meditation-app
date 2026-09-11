-- Circles: launch data.
--
-- Real circles with real descriptions and no members. Nobody is invented to
-- make a circle look busy; the app says "Be one of the first" instead.
--
-- Launch zones: Asia/Manila (UTC+8, the team's own clock) and Europe/London.
-- Change or add zones here for the markets you actually launch in. Each circle
-- runs a session that already exists in src/data/meditations.ts.

insert into public.circle_prompts (id, question, position) values
  ('handled-better', 'What did you handle better than you expected?', 1),
  ('most-yourself', 'When did you feel most like yourself today?', 2),
  ('quietly-well', 'What went quietly well that you might otherwise skip past?', 3),
  ('tell-a-friend', 'What would you say to a friend who had the day you just had?', 4),
  ('rushed', 'Where did you rush today when you did not need to?', 5),
  ('steady', 'When did you feel steady, even briefly?', 6),
  ('kinder', 'Where were you kinder than you strictly had to be?', 7),
  ('leave-behind', 'What is one thing you would like to leave behind today?', 8),
  ('attention', 'What did you give your attention to that deserved it?', 9),
  ('readier', 'What are you readier for now than you were a month ago?', 10),
  ('noticed', 'What did you notice today that you''d usually miss?', 11),
  ('asked-and-gave', 'What did today ask of you, and what did you give it?', 12);
-- Left out on purpose: "What are you carrying that isn't yours to carry?" and
-- "What took more out of you than it should have?" belong in a private
-- journal, not a group feed.

insert into public.circles
  (slug, name, description, goal, time_band, tz, tz_band, session_time, meditation_id)
values
  ('early-light-manila', 'Early Light',
   'Fifteen quiet minutes before the day asks anything of you. A good first circle if mornings are when you can find the time.',
   'calm', 'morning', 'Asia/Manila', 8, '07:00', 'morning-clarity'),
  ('midday-reset-manila', 'Midday Reset',
   'Five minutes in the middle of the working day, to step out of the rush and come back clearer.',
   'focus', 'midday', 'Asia/Manila', 8, '12:30', 'midday-reset'),
  ('evening-unwind-manila', 'Evening Unwind',
   'Twelve minutes to put the day down before the evening begins.',
   'calm', 'evening', 'Asia/Manila', 8, '19:00', 'quiet-the-noise'),
  ('before-sleep-manila', 'Before Sleep',
   'A twenty-minute wind down for people who find it hard to switch off at night.',
   'sleep', 'night', 'Asia/Manila', 8, '22:00', 'night-wind-down'),
  ('early-light-london', 'Early Light',
   'Fifteen quiet minutes before the day asks anything of you. A good first circle if mornings are when you can find the time.',
   'calm', 'morning', 'Europe/London', 0, '07:00', 'morning-clarity'),
  ('midday-reset-london', 'Midday Reset',
   'Five minutes in the middle of the working day, to step out of the rush and come back clearer.',
   'focus', 'midday', 'Europe/London', 0, '12:30', 'midday-reset'),
  ('evening-unwind-london', 'Evening Unwind',
   'Twelve minutes to put the day down before the evening begins.',
   'calm', 'evening', 'Europe/London', 0, '19:00', 'quiet-the-noise'),
  ('before-sleep-london', 'Before Sleep',
   'A twenty-minute wind down for people who find it hard to switch off at night.',
   'sleep', 'night', 'Europe/London', 0, '22:00', 'night-wind-down');
