import { describe, expect, it } from 'vitest';

import { fitWithin, thumbnailUrl } from '@/lib/support-picture';

describe('preparing a picture on the phone', () => {
  it('shrinks the longest side to the limit, keeping the shape', () => {
    expect(fitWithin(1170, 2532)).toEqual({ width: 739, height: 1600 });
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(0, 10)).toEqual({ width: 0, height: 0 });
  });

  it('asks Sanity for a smaller copy, and leaves local previews alone', () => {
    expect(thumbnailUrl('https://cdn.sanity.io/images/p/d/abc-10x10.jpg')).toBe(
      'https://cdn.sanity.io/images/p/d/abc-10x10.jpg?w=480&fit=max&auto=format',
    );
    expect(thumbnailUrl('blob:http://localhost/123')).toBe('blob:http://localhost/123');
  });
});
