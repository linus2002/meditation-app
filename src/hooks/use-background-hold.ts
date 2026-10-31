'use client';

import * as React from 'react';

import { holdBackground } from '@/lib/audio/background';

/** Keeps the native app alive with the screen off while `active`. */
export function useBackgroundHold(active: boolean): void {
  React.useEffect(() => (active ? holdBackground() : undefined), [active]);
}
