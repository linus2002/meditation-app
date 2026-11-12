import { describe, expect, it } from 'vitest';

import { meditations } from '@/data/meditations';
import { programs } from '@/data/programs';
import { stories } from '@/data/stories';
import { settingToggles } from '@/data/settings';
import { appShortcuts } from '@/data/shortcuts';
import { yogaSessions } from '@/data/yoga';

import { buildKapwaContext, findSessionTitles, parseSessionLine } from './kapwa-context';

const [first, second] = meditations;

function context(sessions: Parameters<typeof buildKapwaContext>[0]['sessions'] = []) {
  return buildKapwaContext({
    meditations,
    programs,
    stories,
    yoga: yogaSessions,
    sessions,
    favorites: [second.id],
    streakDays: 2,
    settings: settingToggles,
    shortcuts: appShortcuts,
  });
}

describe('buildKapwaContext', () => {
  it('sorts library sessions into finished, started and not-tried lists', () => {
    const text = context([
      { id: 'a', meditationId: first.id, date: '2026-11-10', seconds: 600, completed: true, startedAt: 1 },
      { id: 'b', meditationId: second.id, date: '2026-11-11', seconds: 120, completed: false, startedAt: 2 },
    ]);
    const section = (heading: string) => text.split(heading)[1].split('\n\n')[0];
    const notTried = section('NOT TRIED YET');
    const finished = section('FINISHED');
    const started = section('STARTED BUT NOT FINISHED');
    expect(notTried).toContain(`(${meditations.length - 2})`);
    expect(notTried).not.toContain(`[${first.id}]`);
    expect(notTried).not.toContain(`[${second.id}]`);
    expect(notTried).toContain(`[${meditations[2].id}]`);
    expect(finished).toContain(`${first.title} (`);
    expect(finished).not.toContain(`[${second.id}]`);
    expect(started).toContain(`[${second.id}]`);
    expect(section('FAVOURITES')).toContain(`[${second.id}]`);
    expect(text).toContain('Current streak: 2 days.');
  });

  it('describes settings by the names the app shows', () => {
    const text = context();
    for (const toggle of settingToggles) expect(text).toContain(toggle.label);
    expect(text).toContain('Daily reminder');
  });

  it('lists every library session, programme, story and yoga session', () => {
    const text = context();
    for (const m of meditations) expect(text).toContain(m.id);
    for (const p of programs) expect(text).toContain(p.title);
    for (const s of stories) expect(text).toContain(s.title);
    for (const y of yogaSessions) expect(text).toContain(y.title);
  });

  it('stays well inside the size the edge function accepts', () => {
    expect(context().length).toBeLessThan(16_000);
  });
});

describe('parseSessionLine', () => {
  it('splits off the ids on the final SESSIONS line', () => {
    expect(parseSessionLine('Try these two.\nSESSIONS: morning-clarity, free-your-mind')).toEqual({
      text: 'Try these two.',
      ids: ['morning-clarity', 'free-your-mind'],
    });
  });

  it('holds back a SESSIONS line still being streamed', () => {
    expect(parseSessionLine('Try this one.\nSESS').text).toBe('Try this one.');
  });

  it('leaves an ordinary reply alone', () => {
    expect(parseSessionLine('Breathe in slowly.')).toEqual({ text: 'Breathe in slowly.', ids: [] });
  });
});

describe('parseSessionLine, untidy model output', () => {
  it('copes with the line run on after the text and trailing punctuation', () => {
    expect(parseSessionLine('Try this. SESSIONS: body-scan, open-heart.').ids).toEqual(['body-scan', 'open-heart']);
  });
});

describe('findSessionTitles', () => {
  const sessions = [
    { id: 'body-scan', title: 'Body Scan' },
    { id: 'full-body-scan', title: 'Full Body Scan' },
    { id: 'open-heart', title: 'Open Heart' },
  ];

  it('finds titles in reading order, preferring the longer title', () => {
    expect(findSessionTitles('Try Open Heart, then the Full Body Scan.', sessions)).toEqual([
      'open-heart',
      'full-body-scan',
    ]);
  });

  it('finds nothing in a reply that names no session', () => {
    expect(findSessionTitles('Take a slow breath in.', sessions)).toEqual([]);
  });
});

describe('parseSessionLine, id tags', () => {
  it('removes [id] tags copied into the text, keeping the line breaks', () => {
    expect(parseSessionLine('- Ocean Drift (20 min) [ocean-drift]\n- Box Breathing (8 min) [box-breathing]').text).toBe(
      '- Ocean Drift (20 min)\n- Box Breathing (8 min)',
    );
  });
});
