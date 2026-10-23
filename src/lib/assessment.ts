import type { CategorySlug, StoryCategory } from '@/types';

/**
 * The first-run assessment: twelve short questions about what the reader wants
 * from the app, and the scoring that turns their answers into suggestions.
 *
 * Every option carries a handful of tags. Answering is just collecting tags;
 * the suggestions are whichever sessions, stories, yoga and programmes those
 * tags point at most strongly. Kept free of React and of the content modules so
 * the scoring can be tested on its own — the catalog is passed in.
 */

/**
 * `topic:<category>` leans toward a meditation category, `format:<kind>` toward
 * a kind of content, `item:<id>` toward one specific piece, `minutes:<n>` sets
 * the preferred length and `level:new` marks a beginner.
 */
export type AssessmentTag = string;

export interface AssessmentOption {
  id: string;
  label: string;
  description?: string;
  tags: AssessmentTag[];
}

export interface AssessmentQuestion {
  id: string;
  title: string;
  description: string;
  /** Several options may be picked; otherwise exactly one. */
  multiple?: boolean;
  options: AssessmentOption[];
}

/** Option ids picked, keyed by question id. */
export type AssessmentAnswers = Record<string, string[]>;

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'goals',
    title: 'What brings you here?',
    description: 'Pick as many as you like. You can always change these later.',
    multiple: true,
    options: [
      { id: 'sleep', label: 'Sleep better', description: 'Fall asleep easier and wake rested', tags: ['topic:sleep', 'topic:sleep'] },
      { id: 'stress', label: 'Ease stress and anxiety', description: 'Quiet a busy, worried mind', tags: ['topic:anxiety', 'topic:anxiety'] },
      { id: 'focus', label: 'Sharpen my focus', description: 'Stay with one thing at a time', tags: ['topic:focus', 'topic:focus'] },
      { id: 'happiness', label: 'Feel happier', description: 'Lift my mood and be kinder to myself', tags: ['topic:happiness', 'topic:happiness'] },
      { id: 'relax', label: 'Relax my body', description: 'Let go of tension I carry', tags: ['topic:relaxation', 'topic:relaxation'] },
      { id: 'breathe', label: 'Learn to breathe well', description: 'Simple techniques I can use anywhere', tags: ['topic:breathing', 'topic:breathing'] },
    ],
  },
  {
    id: 'experience',
    title: 'How familiar are you with meditation?',
    description: 'So we can pitch the first sessions at the right pace.',
    options: [
      { id: 'new', label: 'Completely new', description: 'I’ve never really tried it', tags: ['level:new', 'item:free-your-mind', 'item:calm-foundations'] },
      { id: 'some', label: 'I’ve tried a few times', description: 'I know the basics', tags: ['item:calm-foundations'] },
      { id: 'regular', label: 'I meditate regularly', description: 'I’m looking to go deeper', tags: ['item:deep-focus', 'item:six-phase'] },
    ],
  },
  {
    id: 'mood',
    title: 'How do you feel most days?',
    description: 'Go with your first instinct.',
    options: [
      { id: 'stressed', label: 'Stressed or on edge', tags: ['topic:anxiety', 'item:letting-go-of-stress'] },
      { id: 'tired', label: 'Tired and drained', tags: ['topic:sleep', 'topic:relaxation'] },
      { id: 'scattered', label: 'Scattered and distracted', tags: ['topic:focus', 'item:focus-reset'] },
      { id: 'low', label: 'A bit low', tags: ['topic:happiness', 'item:open-heart'] },
      { id: 'good', label: 'Pretty good, actually', tags: ['topic:happiness', 'topic:focus'] },
    ],
  },
  {
    id: 'sleep',
    title: 'How well do you sleep?',
    description: 'Most nights, over the last month.',
    options: [
      { id: 'well', label: 'I sleep well', tags: [] },
      { id: 'falling', label: 'It takes me a while to fall asleep', tags: ['topic:sleep', 'topic:sleep', 'format:story'] },
      { id: 'waking', label: 'I wake up during the night', tags: ['topic:sleep', 'item:sleep-mastery'] },
      { id: 'unrested', label: 'I rarely wake up rested', tags: ['topic:sleep', 'item:sleepy-body-scan'] },
    ],
  },
  {
    id: 'time',
    title: 'How much time can you give each day?',
    description: 'Even a few minutes makes a difference.',
    options: [
      { id: '5', label: 'About 5 minutes', tags: ['minutes:5'] },
      { id: '10', label: '10 minutes', tags: ['minutes:10'] },
      { id: '20', label: '15 to 20 minutes', tags: ['minutes:18'] },
      { id: '30', label: '30 minutes or more', tags: ['minutes:30'] },
    ],
  },
  {
    id: 'when',
    title: 'When would you like to practise?',
    description: 'We’ll suggest sessions that suit that part of the day.',
    options: [
      { id: 'morning', label: 'In the morning', description: 'To start the day clear', tags: ['item:morning-clarity', 'item:better-mornings', 'item:morning-flow', 'item:sun-salutation'] },
      { id: 'midday', label: 'During the day', description: 'A reset between tasks', tags: ['item:midday-reset', 'item:desk-stretch', 'item:afternoon-energy'] },
      { id: 'evening', label: 'In the evening', description: 'To unwind after work', tags: ['item:evening-gratitude', 'item:evening-unwind', 'topic:relaxation'] },
      { id: 'bed', label: 'Right before bed', description: 'To drift off to sleep', tags: ['topic:sleep', 'item:night-wind-down', 'item:bedtime-yoga'] },
    ],
  },
  {
    id: 'formats',
    title: 'What would you enjoy?',
    description: 'Pick as many as you like.',
    multiple: true,
    options: [
      { id: 'guided', label: 'Guided meditations', description: 'A calm voice walks you through it', tags: ['format:meditation', 'format:meditation'] },
      { id: 'stories', label: 'Sleep and calm stories', description: 'Gentle tales read aloud', tags: ['format:story', 'format:story'] },
      { id: 'yoga', label: 'Gentle yoga', description: 'Slow movement, pose by pose', tags: ['format:yoga', 'format:yoga'] },
      { id: 'breathing', label: 'Breathing exercises', description: 'Short and simple, anywhere', tags: ['topic:breathing', 'topic:breathing'] },
    ],
  },
  {
    id: 'body',
    title: 'Where does your body hold tension?',
    description: 'Pick any that apply.',
    multiple: true,
    options: [
      { id: 'neck', label: 'Neck and shoulders', tags: ['item:neck-shoulders', 'item:posture-reset'] },
      { id: 'back', label: 'Back and hips', tags: ['item:back-release', 'item:hip-opener'] },
      { id: 'legs', label: 'Legs and feet', tags: ['item:tired-legs', 'item:wall-yoga'] },
      { id: 'hands', label: 'Hands and wrists', tags: ['item:hands-and-wrists', 'item:desk-stretch'] },
      { id: 'none', label: 'Nowhere in particular', tags: ['item:body-scan'] },
    ],
  },
  {
    id: 'stress',
    title: 'When stress hits, what helps you most?',
    description: 'What you’d reach for first.',
    options: [
      { id: 'breath', label: 'Slowing my breath', tags: ['topic:breathing', 'item:panic-pause', 'item:box-breathing'] },
      { id: 'move', label: 'Moving my body', tags: ['format:yoga', 'item:calm-the-nerves', 'item:mindful-walk'] },
      { id: 'story', label: 'Getting lost in a story', tags: ['format:story', 'format:story'] },
      { id: 'still', label: 'Sitting quietly', tags: ['format:meditation', 'item:quiet-the-noise'] },
    ],
  },
  {
    id: 'setting',
    title: 'Which place calms you most?',
    description: 'We’ll lean toward sessions set there.',
    options: [
      { id: 'ocean', label: 'By the ocean', tags: ['item:ocean-drift', 'item:open-water'] },
      { id: 'rain', label: 'Listening to rain', tags: ['item:rain-on-glass', 'item:rain-walk', 'item:attic-rain'] },
      { id: 'nature', label: 'Out in nature', tags: ['item:mindful-walk', 'item:old-orchard', 'item:greenhouse'] },
      { id: 'night', label: 'Under a night sky', tags: ['item:night-wind-down', 'item:observatory', 'item:lighthouse'] },
    ],
  },
  {
    id: 'kindness',
    title: 'How kind are you to yourself?',
    description: 'There’s no wrong answer here.',
    options: [
      { id: 'kind', label: 'Mostly kind', tags: [] },
      { id: 'sometimes', label: 'Sometimes', tags: ['item:self-compassion'] },
      { id: 'hard', label: 'I’m quite hard on myself', tags: ['topic:happiness', 'item:self-compassion', 'item:kind-to-yourself'] },
    ],
  },
  {
    id: 'guidance',
    title: 'How would you like to start?',
    description: 'You can switch any time.',
    options: [
      { id: 'program', label: 'A step-by-step programme', description: 'A short course, one session a day', tags: ['format:program', 'format:program'] },
      { id: 'pick', label: 'Pick sessions as I go', description: 'Something new whenever I feel like it', tags: ['format:meditation'] },
      { id: 'both', label: 'A mix of both', description: 'A programme plus extras', tags: ['format:program', 'format:meditation'] },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export interface AssessmentProfile {
  /** How strongly each tag was chosen, e.g. `{ 'topic:sleep': 3 }`. */
  weights: Record<string, number>;
  /** Preferred session length, or null when the question was skipped. */
  minutes: number | null;
  beginner: boolean;
}

export function buildProfile(
  answers: AssessmentAnswers,
  questions: AssessmentQuestion[] = ASSESSMENT_QUESTIONS,
): AssessmentProfile {
  const weights: Record<string, number> = {};
  let minutes: number | null = null;
  let beginner = false;

  for (const question of questions) {
    for (const optionId of answers[question.id] ?? []) {
      const option = question.options.find((item) => item.id === optionId);
      for (const tag of option?.tags ?? []) {
        if (tag.startsWith('minutes:')) minutes = Number(tag.slice(8));
        else if (tag === 'level:new') beginner = true;
        else weights[tag] = (weights[tag] ?? 0) + 1;
      }
    }
  }

  return { weights, minutes, beginner };
}

/** Every question has at least one option picked. */
export function isComplete(
  answers: AssessmentAnswers,
  questions: AssessmentQuestion[] = ASSESSMENT_QUESTIONS,
): boolean {
  return questions.every((question) => (answers[question.id]?.length ?? 0) > 0);
}

/** The categories the reader leaned toward, strongest first. */
export function topTopics(profile: AssessmentProfile, count = 3): CategorySlug[] {
  return Object.entries(profile.weights)
    .filter(([tag, weight]) => tag.startsWith('topic:') && weight > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([tag]) => tag.slice(6) as CategorySlug);
}

const weight = (profile: AssessmentProfile, tag: string) => profile.weights[tag] ?? 0;

/** Highest score first; ties keep catalogue order so results are stable. */
function rank<T extends { id: string }>(items: T[], score: (item: T) => number, count: number): T[] {
  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map((entry) => entry.item);
}

/** Which meditation topics each kind of story serves. */
const STORY_TOPICS: Record<StoryCategory, CategorySlug[]> = {
  sleep: ['sleep'],
  relaxation: ['relaxation', 'anxiety'],
  mindfulness: ['focus', 'happiness'],
};

/** Which meditation topics each programme serves. */
const PROGRAM_TOPICS: Record<string, CategorySlug[]> = {
  'six-phase': ['happiness'],
  'sleep-mastery': ['sleep'],
  'steady-mind': ['anxiety'],
  'open-water': ['relaxation'],
  'calm-foundations': ['relaxation', 'focus'],
  'focus-reset': ['focus'],
  'kind-to-yourself': ['happiness'],
  'better-mornings': ['focus', 'happiness'],
  'letting-go-of-stress': ['anxiety', 'relaxation'],
  'breath-school': ['breathing'],
};

/** Which meditation topics each yoga session serves, by id. */
const YOGA_TOPICS: Record<string, CategorySlug[]> = {
  'evening-unwind': ['relaxation'],
  'bedtime-yoga': ['sleep'],
  'breath-balance': ['breathing', 'focus'],
  'restorative-rest': ['relaxation', 'sleep'],
  'calm-the-nerves': ['anxiety'],
  'afternoon-energy': ['focus'],
};

type MeditationLike = { id: string; category: CategorySlug; durationSeconds: number };
type StoryLike = { id: string; category: StoryCategory };
type Identified = { id: string };

export interface Catalog<M, S, Y, P> {
  meditations: M[];
  stories: S[];
  yoga: Y[];
  programs: P[];
}

export interface Recommendations<M, S, Y, P> {
  meditations: M[];
  stories: S[];
  yoga: Y[];
  programs: P[];
}

export function recommend<
  M extends MeditationLike,
  S extends StoryLike,
  Y extends Identified,
  P extends Identified,
>(
  answers: AssessmentAnswers,
  catalog: Catalog<M, S, Y, P>,
): Recommendations<M, S, Y, P> {
  const profile = buildProfile(answers);
  const topics = (list: CategorySlug[]) =>
    list.reduce((sum, topic) => sum + weight(profile, `topic:${topic}`), 0);

  const meditations = rank(
    catalog.meditations,
    (item) => {
      let score = weight(profile, `topic:${item.category}`) * 3 + weight(profile, `item:${item.id}`) * 4;
      if (score === 0) return 0;
      if (profile.minutes !== null) {
        const gap = Math.abs(item.durationSeconds / 60 - profile.minutes);
        score += gap <= 5 ? 2 : gap <= 10 ? 1 : 0;
      }
      return score;
    },
    6,
  );

  // A kind of content the reader passed over entirely still shows when a
  // specific answer pointed at one piece of it, just never by topic alone.
  const storyInterest = weight(profile, 'format:story');
  const stories = rank(
    catalog.stories,
    (item) =>
      weight(profile, `item:${item.id}`) * 4 +
      (storyInterest > 0 ? storyInterest + topics(STORY_TOPICS[item.category]) : 0),
    3,
  );

  const yogaInterest = weight(profile, 'format:yoga');
  const yoga = rank(
    catalog.yoga,
    (item) =>
      weight(profile, `item:${item.id}`) * 3 + (yogaInterest > 0 ? yogaInterest + topics(YOGA_TOPICS[item.id] ?? []) : 0),
    3,
  );

  const programInterest = weight(profile, 'format:program');
  const programs = rank(
    catalog.programs,
    (item) =>
      weight(profile, `item:${item.id}`) * 3 +
      (programInterest > 0 ? programInterest + topics(PROGRAM_TOPICS[item.id] ?? []) : 0) +
      (profile.beginner && item.id === 'calm-foundations' ? 4 : 0),
    2,
  );

  return { meditations, stories, yoga, programs };
}

/**
 * The same items with the suggested ones moved to the front, in the order they
 * were suggested; everything else keeps its place behind them.
 */
export function prioritise<T extends { id: string }>(items: T[], suggested: string[] | undefined): T[] {
  if (!suggested?.length) return items;
  const rankOf = (id: string) => {
    const rank = suggested.indexOf(id);
    return rank === -1 ? Number.POSITIVE_INFINITY : rank;
  };
  return items
    .map((item, index) => ({ item, index, rank: rankOf(item.id) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item);
}
