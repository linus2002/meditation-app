import { describe, expect, it } from 'vitest';

import {
  ASSESSMENT_QUESTIONS,
  buildProfile,
  isComplete,
  prioritise,
  recommend,
  topTopics,
  type AssessmentAnswers,
} from '@/lib/assessment';

const catalog = {
  meditations: [
    { id: 'deep-rest', category: 'sleep' as const, durationSeconds: 45 * 60 },
    { id: 'night-wind-down', category: 'sleep' as const, durationSeconds: 20 * 60 },
    { id: 'deep-focus', category: 'focus' as const, durationSeconds: 20 * 60 },
    { id: 'panic-pause', category: 'anxiety' as const, durationSeconds: 5 * 60 },
  ],
  stories: [
    { id: 'lighthouse', category: 'sleep' as const },
    { id: 'rain-walk', category: 'relaxation' as const },
  ],
  yoga: [{ id: 'bedtime-yoga' }, { id: 'desk-stretch' }],
  programs: [{ id: 'sleep-mastery' }, { id: 'focus-reset' }, { id: 'calm-foundations' }],
};

describe('ASSESSMENT_QUESTIONS', () => {
  it('asks twelve questions, each with unique option ids', () => {
    expect(ASSESSMENT_QUESTIONS).toHaveLength(12);
    for (const question of ASSESSMENT_QUESTIONS) {
      const ids = question.options.map((option) => option.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('isComplete', () => {
  it('needs an answer to every question', () => {
    const all = Object.fromEntries(ASSESSMENT_QUESTIONS.map((q) => [q.id, [q.options[0].id]]));
    expect(isComplete(all)).toBe(true);
    expect(isComplete({ ...all, goals: [] })).toBe(false);
  });
});

describe('buildProfile', () => {
  it('adds up tags and reads the preferred length and level', () => {
    const profile = buildProfile({ goals: ['sleep', 'focus'], time: ['10'], experience: ['new'] });
    expect(profile.weights['topic:sleep']).toBe(2);
    expect(profile.weights['topic:focus']).toBe(2);
    expect(profile.minutes).toBe(10);
    expect(profile.beginner).toBe(true);
  });

  it('ignores unknown questions and options', () => {
    expect(buildProfile({ nope: ['x'], goals: ['missing'] }).weights).toEqual({});
  });
});

describe('topTopics', () => {
  it('lists the strongest topics first', () => {
    const profile = buildProfile({ goals: ['sleep'], sleep: ['falling'], mood: ['scattered'] });
    expect(topTopics(profile)).toEqual(['sleep', 'focus']);
  });
});

describe('recommend', () => {
  const sleeper: AssessmentAnswers = {
    goals: ['sleep'],
    time: ['20'],
    formats: ['stories'],
    guidance: ['program'],
    when: ['bed'],
  };

  it('puts the reader’s topic first, nearest their preferred length', () => {
    const { meditations } = recommend(sleeper, catalog);
    expect(meditations.map((m) => m.id)).toEqual(['night-wind-down', 'deep-rest']);
  });

  it('suggests stories and programmes only when asked for, matching the topic', () => {
    const result = recommend(sleeper, catalog);
    expect(result.stories[0].id).toBe('lighthouse');
    expect(result.programs[0].id).toBe('sleep-mastery');

    const noExtras = recommend({ goals: ['focus'] }, catalog);
    expect(noExtras.stories).toEqual([]);
    expect(noExtras.programs).toEqual([]);
  });

  it('still surfaces a piece an answer named directly', () => {
    const { yoga } = recommend({ when: ['bed'] }, catalog);
    expect(yoga.map((y) => y.id)).toEqual(['bedtime-yoga']);
  });

  it('starts beginners on the foundations programme', () => {
    const { programs } = recommend({ experience: ['new'], guidance: ['pick'] }, catalog);
    expect(programs[0].id).toBe('calm-foundations');
  });
});

describe('prioritise', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('moves suggested items to the front in suggestion order', () => {
    expect(prioritise(items, ['c', 'a']).map((i) => i.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('leaves the list alone without suggestions', () => {
    expect(prioritise(items, undefined)).toBe(items);
    expect(prioritise(items, ['zzz']).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});
