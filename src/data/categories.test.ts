import { describe, expect, it } from 'vitest';

import { deckCards, deckHref } from './categories';

describe('home mood cards', () => {
  it('open the Meditations tab on their mood, not Discover', () => {
    expect(deckHref('/discover?category=happiness')).toBe('/meditations?category=happiness');
    expect(deckHref('/activities')).toBe('/activities');
    for (const card of deckCards) expect(card.href).not.toMatch(/^\/discover\?category=/);
  });
});
