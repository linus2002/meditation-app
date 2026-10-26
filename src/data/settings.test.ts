import { describe, expect, it } from 'vitest';

import { settingToggles } from '@/data/settings';

describe('settingToggles', () => {
  it('contains yogaVoice toggle with correct defaults', () => {
    const yogaToggle = settingToggles.find((t) => t.id === 'yogaVoice');
    expect(yogaToggle).toBeDefined();
    expect(yogaToggle?.label).toBe('Yoga voice guide');
    expect(yogaToggle?.defaultOn).toBe(true);
  });

  it('has unique IDs for every setting toggle', () => {
    const ids = settingToggles.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
