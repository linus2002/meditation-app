import { describe, expect, it } from 'vitest';

import { scrubEvent } from '@/lib/analytics-privacy';

const at = (event: string, properties: Record<string, unknown> = {}) => ({ uuid: 'u', event, properties });

describe('scrubEvent', () => {
  it.each(['$autocapture', '$snapshot', '$rageclick', '$dead_click', '$exception', '$web_vitals', '$$heatmap'])(
    'never sends %s',
    (event) => {
      expect(scrubEvent(at(event))).toBeNull();
    },
  );

  it.each(['/reflections', '/assessment/', '/support/chemo-chair', '/kapwa', '/help?t=12'])(
    'does not report a visit to %s',
    (path) => {
      const url = `https://s.example${path}`;
      const pathname = path.split('?')[0];
      expect(scrubEvent(at('$pageview', { $current_url: url, $pathname: pathname }))).toBeNull();
      expect(scrubEvent(at('$pageleave', { $current_url: url, $pathname: pathname }))).toBeNull();
    },
  );

  it('strips what was typed into search out of every address', () => {
    const sent = scrubEvent(
      at('$pageview', { $current_url: 'https://s.example/search?q=chemo%20fear#top', $pathname: '/search' }),
    );
    expect(sent?.properties.$current_url).toBe('https://s.example/search');
    expect(JSON.stringify(sent)).not.toContain('chemo');
  });

  it('hides a private screen wherever else its address turns up', () => {
    const sent = scrubEvent({
      ...at('$pageview', {
        $current_url: 'https://s.example/home',
        $pathname: '/home',
        $prev_pageview_pathname: '/support/scan-day',
        $session_entry_url: 'https://s.example/support/scan-day',
        $set_once: { $initial_current_url: 'https://s.example/kapwa' },
      }),
      $set_once: { $initial_pathname: '/reflections' },
    });
    expect(JSON.stringify(sent)).not.toMatch(/scan-day|kapwa|reflections/);
  });

  it('keeps the product events, without the score someone gave', () => {
    const sent = scrubEvent(at('meditation_rated', { meditation_id: 'open-heart', score: 2 }));
    expect(sent?.properties).toEqual({ meditation_id: 'open-heart' });
  });

  it('still reports ordinary screens', () => {
    expect(scrubEvent(at('$pageview', { $pathname: '/player/open-heart' }))).not.toBeNull();
  });
});
