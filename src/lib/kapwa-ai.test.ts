import { describe, expect, it } from 'vitest';

import { buildHistory, HISTORY_TURNS, ollamaLineText } from './kapwa-ai';

describe('buildHistory', () => {
  it('drops the welcome and maps speakers to roles, ending with the new message', () => {
    const history = buildHistory(
      [
        { id: 'welcome', from: 'kapwa', text: 'Hi, I’m Kapwa.' },
        { id: 'you-1', from: 'you', text: 'I feel stressed' },
        { id: 'kapwa-1', from: 'kapwa', text: 'That sounds heavy.' },
      ],
      'I can’t sleep either',
    );
    expect(history).toEqual([
      { role: 'user', content: 'I feel stressed' },
      { role: 'assistant', content: 'That sounds heavy.' },
      { role: 'user', content: 'I can’t sleep either' },
    ]);
  });

  it('keeps only the most recent turns', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: `m-${i}`,
      from: (i % 2 ? 'kapwa' : 'you') as 'kapwa' | 'you',
      text: `message ${i}`,
    }));
    const history = buildHistory(many, 'latest');
    expect(history).toHaveLength(HISTORY_TURNS);
    expect(history.at(-1)).toEqual({ role: 'user', content: 'latest' });
  });
});

describe('ollamaLineText', () => {
  it('reads the text from one streamed line, and ignores anything else', () => {
    expect(ollamaLineText('{"message":{"role":"assistant","content":"Breathe"},"done":false}')).toBe('Breathe');
    expect(ollamaLineText('{"done":true}')).toBe('');
    expect(ollamaLineText('not json')).toBe('');
    expect(ollamaLineText('')).toBe('');
  });
});
