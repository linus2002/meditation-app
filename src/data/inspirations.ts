/**
 * Daily inspiration: one short, uplifting line a day.
 *
 * Written for Serenity rather than quoted, so there is no attribution to get
 * wrong and no licence to honour. Each is short enough to read whole in a
 * phone notification, and none of them tell anyone how they ought to feel —
 * they offer permission, not pressure.
 *
 * Every message carries keywords (`tags`). `lib/inspiration.ts` weighs them
 * against what the reader has chosen and what the app already knows — a heavy
 * reflection, a rough night, a few days away — to pick the right one.
 *
 * Ids are stored in each reader's history, so never rename or reuse one.
 */

export type InspirationTag =
  | 'calm'
  | 'sleep'
  | 'focus'
  | 'self-kindness'
  | 'hard-day'
  | 'new-start'
  | 'momentum';

export interface Inspiration {
  id: string;
  text: string;
  tags: InspirationTag[];
}

export const inspirations: Inspiration[] = [
  { id: 'next-breath', text: 'You don’t have to be strong every moment. Just take the next breath.', tags: ['hard-day', 'self-kindness', 'calm'] },
  { id: 'rest-need', text: 'Rest is not a reward you earn. It is something you need.', tags: ['sleep', 'self-kindness'] },
  { id: 'small-steady', text: 'Small and steady still counts. Today, small is enough.', tags: ['momentum', 'self-kindness'] },
  { id: 'begin-again', text: 'You can begin again at any moment, including this one.', tags: ['new-start'] },
  { id: 'breathe-first', text: 'Nothing has to be solved in the next minute. Breathe first.', tags: ['calm', 'hard-day'] },
  { id: 'patient-friend', text: 'Be as patient with yourself as you would be with a friend.', tags: ['self-kindness'] },
  { id: 'worth', text: 'Your worth is not measured by how much you got done.', tags: ['self-kindness', 'hard-day'] },
  { id: 'good-thing', text: 'Notice one good thing today, however small. It is real.', tags: ['calm'] },
  { id: 'weather', text: 'Feelings pass like weather. You are the sky they move through.', tags: ['calm', 'hard-day'] },
  { id: 'go-slowly', text: 'It is okay to go slowly. Slow is still moving.', tags: ['new-start', 'self-kindness'] },
  { id: 'quiet-minutes', text: 'A few quiet minutes can change the shape of a whole day.', tags: ['calm', 'focus'] },
  { id: 'hard-days-so-far', text: 'You have made it through every hard day so far. That matters.', tags: ['hard-day'] },
  { id: 'longer-breath', text: 'Let this breath be a little longer than the last one.', tags: ['calm'] },
  { id: 'put-down', text: 'You are allowed to put some things down today.', tags: ['hard-day', 'self-kindness'] },
  { id: 'not-straight', text: 'Progress is not a straight line, and that is fine.', tags: ['new-start', 'momentum'] },
  { id: 'softness', text: 'Softness is not weakness. It takes courage to be gentle.', tags: ['self-kindness'] },
  { id: 'feel-ready', text: 'You don’t need to feel ready. You only need to start.', tags: ['new-start', 'focus'] },
  { id: 'no-rush', text: 'Today, try doing one thing without rushing it.', tags: ['focus', 'calm'] },
  { id: 'morning-new', text: 'Whatever happened yesterday, this morning is new.', tags: ['new-start', 'hard-day'] },
  { id: 'coming-back', text: 'Your mind is allowed to wander. Coming back is the practice.', tags: ['focus'] },
  { id: 'kindness-begins', text: 'Kindness to yourself is where kindness to others begins.', tags: ['self-kindness'] },
  { id: 'better-than-worries', text: 'You are doing better than your worries tell you.', tags: ['hard-day', 'self-kindness'] },
  { id: 'no-wrong-pause', text: 'There is no wrong way to take a pause.', tags: ['calm'] },
  { id: 'getting-through', text: 'Some days, getting through is the achievement.', tags: ['hard-day'] },
  { id: 'shoulders', text: 'Let your shoulders drop. Unclench your jaw. Breathe out.', tags: ['calm', 'sleep'] },
  { id: 'peace-here', text: 'Peace is not somewhere else. It is here, one breath at a time.', tags: ['calm'] },
  { id: 'best-today', text: 'It is enough to do your best with what you have today.', tags: ['self-kindness', 'hard-day'] },
  { id: 'hope-worry', text: 'You can hold hope and worry at the same time.', tags: ['hard-day'] },
  { id: 'present-moment', text: 'The present moment is the only place you ever have to be.', tags: ['calm', 'focus'] },
  { id: 'ordinary-moments', text: 'A calm mind is built from many small, ordinary moments.', tags: ['momentum', 'calm'] },
  { id: 'quiet-effort', text: 'Be proud of the quiet effort no one else sees.', tags: ['momentum', 'self-kindness'] },
  { id: 'no-answer', text: 'Not everything needs an answer today.', tags: ['calm', 'sleep'] },
  { id: 'breath-with-you', text: 'Your breath is always with you, wherever you are.', tags: ['calm'] },
  { id: 'let-go-one', text: 'Choose one thing to let go of, just for today.', tags: ['calm', 'sleep'] },
  { id: 'gently', text: 'Gently does it. You have time.', tags: ['new-start', 'self-kindness'] },
  { id: 'own-path', text: 'You are not behind. You are on your own path.', tags: ['new-start', 'self-kindness'] },
  { id: 'sitting-down', text: 'The hardest part is often just sitting down. You can do that.', tags: ['new-start', 'focus'] },
  { id: 'exhale', text: 'Every exhale is a small letting go.', tags: ['sleep', 'calm'] },
  { id: 'care-loved', text: 'Care for yourself the way you care for the people you love.', tags: ['self-kindness'] },
  { id: 'night-ends', text: 'Even the longest night ends. Morning always comes.', tags: ['hard-day', 'sleep'] },
  { id: 'stillness', text: 'Stillness is not empty. It is full of room to breathe.', tags: ['calm'] },
  { id: 'take-time', text: 'You are allowed to take time for yourself.', tags: ['self-kindness'] },
  { id: 'tired-okay', text: 'A tired day can still be a gentle one. Go easy on yourself.', tags: ['sleep', 'self-kindness'] },
  { id: 'rest-tonight', text: 'Tonight, let rest be the only thing on your list.', tags: ['sleep'] },
  { id: 'put-day-down', text: 'The day is almost done. You can put it down now.', tags: ['sleep', 'calm'] },
  { id: 'showing-up', text: 'You’ve been showing up. Let that quietly carry you today.', tags: ['momentum'] },
  { id: 'day-by-day', text: 'One day at a time is how every habit is built.', tags: ['momentum', 'new-start'] },
  { id: 'coming-back-again', text: 'Consistency isn’t perfection. It’s coming back, again and again.', tags: ['momentum', 'new-start'] },
  { id: 'one-task', text: 'Give the next task your full attention, then let it go.', tags: ['focus'] },
  { id: 'one-slow-breath', text: 'Before you begin, take one slow breath. Then start.', tags: ['focus', 'calm'] },
  { id: 'welcome-back', text: 'Welcome back. It doesn’t matter how long it’s been.', tags: ['new-start'] },
  { id: 'nothing-to-catch-up', text: 'There is nothing to catch up on. Just sit for a minute today.', tags: ['new-start'] },
  { id: 'clear-head', text: 'A clear head starts with a slower breath.', tags: ['focus'] },
  { id: 'enough-now', text: 'Right now, in this breath, you are enough.', tags: ['self-kindness', 'hard-day'] },
  { id: 'body-soften', text: 'Sleep comes more easily to a body that feels safe. Let yours soften.', tags: ['sleep'] },
];

const byId = new Map(inspirations.map((entry) => [entry.id, entry]));

export function inspirationById(id: string): Inspiration | undefined {
  return byId.get(id);
}

/** Days since 1970 for a `YYYY-MM-DD` key — the basis of every rotation. */
export function dayNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** One of `list`, rotating by date: stable all day, different the next. */
export function rotateByDate<T>(list: T[], dateKey: string): T {
  const index = ((dayNumber(dateKey) % list.length) + list.length) % list.length;
  return list[index];
}

/**
 * The same-for-everyone message for a date — used when nothing is known
 * about the reader, and by anything that cannot see their data.
 */
export function inspirationForDate(dateKey: string): string {
  return rotateByDate(inspirations, dateKey).text;
}
